import mongoose from "mongoose";
import { z } from "zod";
import { Purchase } from "../models/Purchase.js";
import { Supplier } from "../models/Supplier.js";
import { SupplierPayment } from "../models/SupplierPayment.js";
import { Ledger } from "../models/Ledger.js";
import { FinancialTransaction } from "../models/FinancialTransaction.js";
import { PaymentMethod } from "../models/PaymentMethod.js";
import { paymentStatus, recordOutgoingPayment, roundMoney } from "../services/finance.js";
import { insertOne } from "../services/insert.js";
import { appendLedger, rebuildSupplierLedger } from "../services/ledger.js";
import { withOptionalTransaction } from "../services/session.js";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const schema = z.object({
  supplierId: z.string().min(1, "Every supplier payment must belong to a supplier."),
  paymentDate: z.string().min(1, "Payment date is required."),
  amount: z.number().positive("Amount must be greater than 0."),
  paymentMethod: z.string().min(1, "Payment method is required."),
  referenceNumber: z.string().optional().default(""),
  notes: z.string().optional().default(""),
});

export const listPayments = asyncHandler(async (req, res) => {
  const filter: Record<string, unknown> = {};
  if (req.query.supplierId) filter.supplierId = req.query.supplierId;
  const payments = await SupplierPayment.find(filter)
    .populate("supplierId", "name businessName")
    .sort({ paymentDate: -1, createdAt: -1 })
    .limit(500);
  res.json({
    payments: payments.map((p) => ({
      id: String(p._id),
      supplierId: String((p.supplierId as { _id?: unknown })._id ?? p.supplierId),
      supplier:
        p.supplierId && typeof p.supplierId === "object" && "name" in p.supplierId
          ? {
              id: String((p.supplierId as { _id: unknown })._id),
              name: (p.supplierId as { name: string }).name,
            }
          : null,
      paymentDate: p.paymentDate,
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      referenceNumber: p.referenceNumber,
      notes: p.notes,
      createdAt: p.createdAt,
    })),
  });
});

export const createPayment = asyncHandler(async (req, res) => {
  const data = schema.parse(req.body);
  if (!mongoose.isValidObjectId(data.supplierId)) {
    throw new AppError("Every supplier payment must belong to a supplier.", 400);
  }
  const supplier = await Supplier.findById(data.supplierId);
  if (!supplier) throw new AppError("Supplier not found.", 404);

  const method = await PaymentMethod.findOne({ key: data.paymentMethod, enabled: true });
  if (!method) throw new AppError("Selected payment method is not available.", 400);

  const amount = roundMoney(data.amount);

  const payment = await withOptionalTransaction(async (session) => {
    const purchases = await Purchase.find({
      supplierId: supplier._id,
      outstandingAmount: { $gt: 0 },
    })
      .sort({ purchaseDate: 1, createdAt: 1 })
      .session(session);

    const outstanding = roundMoney(purchases.reduce((s, p) => s + p.outstandingAmount, 0));
    if (amount - outstanding > 0.009) {
      throw new AppError(
        "Payment amount cannot exceed outstanding balance.",
        400,
        "EXCEEDS_OUTSTANDING"
      );
    }

    let remaining = amount;
    for (const purchase of purchases) {
      if (remaining <= 0) break;
      const apply = Math.min(purchase.outstandingAmount, remaining);
      purchase.paidAmount = roundMoney(purchase.paidAmount + apply);
      purchase.outstandingAmount = roundMoney(purchase.grandTotal - purchase.paidAmount);
      purchase.status = paymentStatus(purchase.outstandingAmount, purchase.paidAmount);
      await purchase.save({ session: session ?? undefined });
      remaining = roundMoney(remaining - apply);
    }

    const created = await insertOne(SupplierPayment, {
      supplierId: supplier._id,
      paymentDate: new Date(data.paymentDate),
      amount,
      paymentMethod: data.paymentMethod,
      referenceNumber: data.referenceNumber,
      notes: data.notes,
      isInitialPurchasePayment: false,
    }, session);

    await appendLedger({
      supplierId: supplier._id,
      date: created.paymentDate,
      transactionType: "payment",
      referenceId: created._id,
      reference: created.referenceNumber || `PAY-${String(created._id).slice(-6)}`,
      debit: 0,
      credit: amount,
      session,
    });

    await recordOutgoingPayment({
      date: created.paymentDate,
      method: data.paymentMethod,
      amount,
      referenceType: "supplier_payment",
      referenceId: String(created._id),
      notes: created.notes,
      session,
    });

    return created;
  });

  res.status(201).json({ payment });
});

export const deletePayment = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    throw new AppError("Payment not found.", 404);
  }
  await withOptionalTransaction(async (session) => {
    const payment = await SupplierPayment.findById(req.params.id).session(session);
    if (!payment) throw new AppError("Payment not found.", 404);
    if (payment.isInitialPurchasePayment) {
      throw new AppError("Initial purchase payments must be changed or deleted with the purchase.", 409);
    }

    await SupplierPayment.deleteOne({ _id: payment._id }).session(session);
    await Ledger.deleteMany({
      supplierId: payment.supplierId,
      transactionType: "payment",
      referenceId: payment._id,
    }).session(session);
    await FinancialTransaction.deleteMany({
      referenceType: "supplier_payment",
      referenceId: String(payment._id),
    }).session(session);

    const purchases = await Purchase.find({ supplierId: payment.supplierId })
      .sort({ purchaseDate: 1, createdAt: 1 })
      .session(session);
    for (const purchase of purchases) {
      purchase.paidAmount = 0;
      purchase.outstandingAmount = purchase.grandTotal;
      purchase.status = "unpaid";
    }
    const initialPayments = await SupplierPayment.find({
      supplierId: payment.supplierId,
      isInitialPurchasePayment: true,
    }).session(session);
    for (const initial of initialPayments) {
      const purchase = purchases.find((p) => String(p._id) === String(initial.purchaseId));
      if (purchase) {
        purchase.paidAmount = roundMoney(Math.min(purchase.paidAmount + initial.amount, purchase.grandTotal));
      }
    }
    const remainingPayments = await SupplierPayment.find({
      supplierId: payment.supplierId,
      isInitialPurchasePayment: false,
    }).sort({ paymentDate: 1, createdAt: 1 }).session(session);
    let remaining = remainingPayments.reduce((sum, p) => sum + p.amount, 0);
    for (const purchase of purchases) {
      if (remaining <= 0) break;
      const outstanding = roundMoney(purchase.grandTotal - purchase.paidAmount);
      const apply = Math.min(outstanding, remaining);
      purchase.paidAmount = roundMoney(purchase.paidAmount + apply);
      remaining = roundMoney(remaining - apply);
    }
    for (const purchase of purchases) {
      purchase.outstandingAmount = roundMoney(purchase.grandTotal - purchase.paidAmount);
      purchase.status = paymentStatus(purchase.outstandingAmount, purchase.paidAmount);
      await purchase.save({ session: session ?? undefined });
    }
    await rebuildSupplierLedger(payment.supplierId, session);
  });
  res.json({ ok: true });
});
