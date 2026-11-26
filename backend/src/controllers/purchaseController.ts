import mongoose from "mongoose";
import { z } from "zod";
import { Purchase } from "../models/Purchase.js";
import { PRODUCT_CATEGORIES } from "../models/Supplier.js";
import { Supplier } from "../models/Supplier.js";
import { SupplierPayment } from "../models/SupplierPayment.js";
import { Ledger } from "../models/Ledger.js";
import { FinancialTransaction } from "../models/FinancialTransaction.js";
import { PaymentMethod } from "../models/PaymentMethod.js";
import { recordOutgoingPayment, roundMoney, paymentStatus } from "../services/finance.js";
import { insertOne } from "../services/insert.js";
import { appendLedger, rebuildSupplierLedger } from "../services/ledger.js";
import { withOptionalTransaction } from "../services/session.js";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const itemSchema = z.object({
  productName: z.string().trim().min(1, "Product name is required."),
  category: z.enum(PRODUCT_CATEGORIES),
  quantity: z.number().positive("Quantity must be greater than 0."),
  rate: z.number().min(0, "Rate cannot be negative."),
  discount: z.number().min(0).optional().default(0),
});

const purchaseSchema = z.object({
  supplierId: z.string().min(1, "Every purchase must have a supplier."),
  invoiceNumber: z.string().trim().optional().default(""),
  purchaseDate: z.string().min(1, "Purchase date is required."),
  items: z.array(itemSchema).optional().default([]),
  totalAmount: z.number().min(0).optional(),
  otherCharges: z.number().min(0).optional().default(0),
  paidAmount: z.number().min(0).optional().default(0),
  paymentMethod: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

function calcPurchase(items: z.infer<typeof itemSchema>[], otherCharges: number, paidAmount: number) {
  const mapped = items.map((item) => {
    const total = roundMoney(item.quantity * item.rate - (item.discount ?? 0));
    return { ...item, total: Math.max(total, 0) };
  });
  const subtotal = roundMoney(mapped.reduce((s, i) => s + i.quantity * i.rate, 0));
  const discount = roundMoney(mapped.reduce((s, i) => s + (i.discount ?? 0), 0));
  const grandTotal = roundMoney(subtotal - discount + otherCharges);
  if (paidAmount - grandTotal > 0.009) {
    throw new AppError("Paid amount cannot exceed the grand total.", 400, "PAID_EXCEEDS_TOTAL");
  }
  const outstandingAmount = roundMoney(grandTotal - paidAmount);
  return {
    items: mapped,
    subtotal,
    discount,
    otherCharges: roundMoney(otherCharges),
    grandTotal,
    paidAmount: roundMoney(paidAmount),
    outstandingAmount,
    status: paymentStatus(outstandingAmount, paidAmount),
  };
}

export const listPurchases = asyncHandler(async (req, res) => {
  const filter: Record<string, unknown> = {};
  if (req.query.supplierId) filter.supplierId = req.query.supplierId;
  const purchases = await Purchase.find(filter)
    .populate("supplierId", "name businessName")
    .sort({ purchaseDate: -1, createdAt: -1 })
    .limit(500);
  res.json({
    purchases: purchases.map((p) => ({
      id: String(p._id),
      supplierId: String(p.supplierId._id ?? p.supplierId),
      supplier:
        p.supplierId && typeof p.supplierId === "object" && "name" in p.supplierId
          ? {
              id: String((p.supplierId as { _id: unknown })._id),
              name: (p.supplierId as { name: string }).name,
              businessName: (p.supplierId as { businessName?: string }).businessName ?? "",
            }
          : null,
      invoiceNumber: p.invoiceNumber,
      purchaseDate: p.purchaseDate,
      items: p.items,
      subtotal: p.subtotal,
      discount: p.discount,
      otherCharges: p.otherCharges,
      grandTotal: p.grandTotal,
      paidAmount: p.paidAmount,
      outstandingAmount: p.outstandingAmount,
      paymentMethod: p.paymentMethod,
      status: p.status,
      notes: p.notes,
      createdAt: p.createdAt,
    })),
  });
});

export const getPurchase = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findById(req.params.id).populate("supplierId", "name businessName");
  if (!purchase) throw new AppError("Purchase not found.", 404);
  res.json({ purchase });
});

export const deletePurchase = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new AppError("Purchase not found.", 404);
  }
  await withOptionalTransaction(async (session) => {
    const purchase = await Purchase.findById(req.params.id).session(session);
    if (!purchase) throw new AppError("Purchase not found.", 404);

    const initialPayment = await SupplierPayment.findOne({
      purchaseId: purchase._id,
      isInitialPurchasePayment: true,
    }).session(session);
    if (initialPayment) {
      await SupplierPayment.deleteOne({ _id: initialPayment._id }).session(session);
      await Ledger.deleteMany({
        supplierId: purchase.supplierId,
        transactionType: "payment",
        referenceId: initialPayment._id,
      }).session(session);
      await FinancialTransaction.deleteMany({
        referenceType: "purchase_payment",
        referenceId: String(purchase._id),
      }).session(session);
    }

    await Ledger.deleteMany({
      supplierId: purchase.supplierId,
      referenceId: purchase._id,
    }).session(session);
    await Purchase.deleteOne({ _id: purchase._id }).session(session);

    const purchases = await Purchase.find({ supplierId: purchase.supplierId })
      .sort({ purchaseDate: 1, createdAt: 1 })
      .session(session);
    const initialPayments = await SupplierPayment.find({
      supplierId: purchase.supplierId,
      isInitialPurchasePayment: true,
    }).sort({ paymentDate: 1, createdAt: 1 }).session(session);
    const ordinaryPayments = await SupplierPayment.find({
      supplierId: purchase.supplierId,
      isInitialPurchasePayment: false,
    }).sort({ paymentDate: 1, createdAt: 1 }).session(session);

    for (const p of purchases) {
      p.paidAmount = 0;
      p.outstandingAmount = p.grandTotal;
      p.status = "unpaid";
    }

    for (const initial of initialPayments) {
      const linked = purchases.find((p) => String(p._id) === String(initial.purchaseId));
      if (!linked) continue;
      linked.paidAmount = roundMoney(Math.min(linked.paidAmount + initial.amount, linked.grandTotal));
    }
    let remainingPayments = ordinaryPayments.reduce((sum, payment) => sum + payment.amount, 0);
    for (const p of purchases) {
      if (remainingPayments <= 0) break;
      p.outstandingAmount = roundMoney(p.grandTotal - p.paidAmount);
      const apply = Math.min(p.outstandingAmount, remainingPayments);
      p.paidAmount = roundMoney(p.paidAmount + apply);
      remainingPayments = roundMoney(remainingPayments - apply);
    }
    for (const p of purchases) {
      p.outstandingAmount = roundMoney(p.grandTotal - p.paidAmount);
      p.status = paymentStatus(p.outstandingAmount, p.paidAmount);
      await p.save({ session: session ?? undefined });
    }
    await rebuildSupplierLedger(purchase.supplierId, session);
  });
  res.json({ ok: true });
});

export const createPurchase = asyncHandler(async (req, res) => {
  const data = purchaseSchema.parse(req.body);
  if (!mongoose.isValidObjectId(data.supplierId)) {
    throw new AppError("Every purchase must have a supplier.", 400);
  }
  const supplier = await Supplier.findById(data.supplierId);
  if (!supplier) throw new AppError("Supplier not found.", 404);

  if (data.items.length === 0 && data.totalAmount === undefined) {
    throw new AppError("Total amount is required.", 400);
  }
  const calc =
    data.items.length > 0
      ? calcPurchase(data.items, data.otherCharges, data.paidAmount)
      : {
          items: [],
          subtotal: roundMoney(data.totalAmount ?? 0),
          discount: 0,
          otherCharges: 0,
          grandTotal: roundMoney(data.totalAmount ?? 0),
          paidAmount: roundMoney(data.paidAmount),
          outstandingAmount: roundMoney((data.totalAmount ?? 0) - data.paidAmount),
          status: paymentStatus(
            roundMoney((data.totalAmount ?? 0) - data.paidAmount),
            roundMoney(data.paidAmount)
          ),
        };
  if (calc.paidAmount - calc.grandTotal > 0.009) {
    throw new AppError("Paid amount cannot exceed the grand total.", 400, "PAID_EXCEEDS_TOTAL");
  }
  const invoiceNumber =
    data.invoiceNumber || `PUR-${new mongoose.Types.ObjectId().toHexString().toUpperCase()}`;
  if (calc.paidAmount > 0) {
    if (!data.paymentMethod) throw new AppError("Payment method is required when an amount is paid.", 400);
    const method = await PaymentMethod.findOne({ key: data.paymentMethod, enabled: true });
    if (!method) throw new AppError("Selected payment method is not available.", 400);
  }

  const purchase = await withOptionalTransaction(async (session) => {
    const created = await insertOne(Purchase, {
      supplierId: supplier._id,
      invoiceNumber,
      purchaseDate: new Date(data.purchaseDate),
      items: calc.items,
      subtotal: calc.subtotal,
      discount: calc.discount,
      otherCharges: calc.otherCharges,
      grandTotal: calc.grandTotal,
      paidAmount: calc.paidAmount,
      outstandingAmount: calc.outstandingAmount,
      paymentMethod: data.paymentMethod,
      status: calc.status,
      notes: data.notes,
    }, session);

    await appendLedger({
      supplierId: supplier._id,
      date: created.purchaseDate,
      transactionType: "purchase",
      referenceId: created._id,
      reference: created.invoiceNumber,
      debit: created.grandTotal,
      credit: 0,
      session,
    });

    if (created.paidAmount > 0) {
      const payment = await insertOne(SupplierPayment, {
        supplierId: supplier._id,
        paymentDate: created.purchaseDate,
        amount: created.paidAmount,
        paymentMethod: data.paymentMethod,
        referenceNumber: created.invoiceNumber,
        notes: "Initial purchase payment",
        purchaseId: created._id,
        isInitialPurchasePayment: true,
      }, session);

      await appendLedger({
        supplierId: supplier._id,
        date: created.purchaseDate,
        transactionType: "payment",
        referenceId: payment._id,
        reference: payment.referenceNumber || created.invoiceNumber,
        debit: 0,
        credit: created.paidAmount,
        session,
      });

      await recordOutgoingPayment({
        date: created.purchaseDate,
        method: data.paymentMethod,
        amount: created.paidAmount,
        referenceType: "purchase_payment",
        referenceId: String(created._id),
        notes: `Purchase ${created.invoiceNumber}`,
        session,
      });
    }

    return created;
  });

  res.status(201).json({ purchase });
});
