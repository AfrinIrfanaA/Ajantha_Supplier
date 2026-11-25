import mongoose from "mongoose";
import { z } from "zod";
import { Purchase } from "../models/Purchase.js";
import { Supplier, PRODUCT_CATEGORIES, SUPPLIER_TYPES } from "../models/Supplier.js";
import { SupplierPayment } from "../models/SupplierPayment.js";
import { Ledger } from "../models/Ledger.js";
import { FinancialTransaction } from "../models/FinancialTransaction.js";
import { emptyTotals, getSupplierTotals } from "../services/supplierTotals.js";
import { withOptionalTransaction } from "../services/session.js";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const mobileRegex = /^[0-9]{10}$/;

const supplierSchema = z.object({
  name: z.string().trim().min(1, "Supplier name is required."),
  businessName: z.string().trim().optional().default(""),
  mobile: z.string().trim().regex(mobileRegex, "Enter exactly 10 digits for the Indian mobile number."),
  city: z.string().trim().optional().default(""),
  address: z.string().trim().optional().default(""),
  notes: z.string().trim().optional().default(""),
  supplierType: z.enum(SUPPLIER_TYPES, { required_error: "Supplier type is required." }),
  categories: z.array(z.enum(PRODUCT_CATEGORIES)).optional().default([]),
  preferredPaymentMethod: z.string().optional().default("cash"),
  otherCategory: z.string().trim().optional().default(""),
});

export const listSuppliers = asyncHandler(async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const supplierType = String(req.query.supplierType ?? "");
  const category = String(req.query.category ?? "");
  const paymentStatusFilter = String(req.query.paymentStatus ?? "");
  const dateFrom = req.query.dateFrom ? new Date(String(req.query.dateFrom)) : null;
  const dateTo = req.query.dateTo ? new Date(String(req.query.dateTo)) : null;
  const datePreset = String(req.query.datePreset ?? "");
  let presetFrom: Date | null = null;
  let presetTo: Date | null = null;
  const now = new Date();
  if (datePreset === "today") {
    presetFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    presetTo = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (datePreset === "week") {
    presetFrom = new Date(now);
    presetFrom.setDate(now.getDate() - now.getDay());
  } else if (datePreset === "month") {
    presetFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (datePreset === "year") {
    presetFrom = new Date(now.getFullYear(), 0, 1);
  } else if (datePreset === "financialYear") {
    const startYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
    presetFrom = new Date(startYear, 3, 1);
  }
  const minPurchase = req.query.minPurchase ? Number(req.query.minPurchase) : null;
  const maxPurchase = req.query.maxPurchase ? Number(req.query.maxPurchase) : null;
  const minOutstanding = req.query.minOutstanding ? Number(req.query.minOutstanding) : null;
  const maxOutstanding = req.query.maxOutstanding ? Number(req.query.maxOutstanding) : null;

  const filter: Record<string, unknown> = {};
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { businessName: { $regex: q, $options: "i" } },
      { mobile: { $regex: q, $options: "i" } },
    ];
  }
  if (supplierType) filter.supplierType = supplierType;
  if (category) filter.categories = category;

  const suppliers = await Supplier.find(filter).sort({ createdAt: -1 });
  const totals = await getSupplierTotals(suppliers.map((s) => s._id));

  let rows = suppliers.map((s) => {
    const t = totals.get(String(s._id)) ?? emptyTotals();
    return {
      id: String(s._id),
      name: s.name,
      businessName: s.businessName,
      mobile: s.mobile,
      city: s.city,
      address: s.address,
      notes: s.notes,
      supplierType: s.supplierType,
      categories: s.categories,
      preferredPaymentMethod: s.preferredPaymentMethod,
      otherCategory: s.otherCategory,
      totalPurchases: t.totalPurchases,
      totalPaid: t.totalPaid,
      outstanding: t.outstanding,
      paymentStatus: t.status,
      firstPurchase: t.firstPurchase,
      lastPurchase: t.lastPurchase,
      createdAt: s.createdAt,
    };
  });

  rows = rows.filter((r) => {
    if (presetFrom && (!r.firstPurchase || r.lastPurchase! < presetFrom)) return false;
    if (presetTo && (!r.lastPurchase || r.firstPurchase! > presetTo)) return false;
    if (paymentStatusFilter && r.paymentStatus !== paymentStatusFilter) return false;
    if (dateFrom && (!r.firstPurchase || r.lastPurchase! < dateFrom)) return false;
    if (dateTo && (!r.lastPurchase || r.firstPurchase! > dateTo)) return false;
    if (minPurchase != null && r.totalPurchases < minPurchase) return false;
    if (maxPurchase != null && r.totalPurchases > maxPurchase) return false;
    if (minOutstanding != null && r.outstanding < minOutstanding) return false;
    if (maxOutstanding != null && r.outstanding > maxOutstanding) return false;
    return true;
  });

  res.json({ suppliers: rows });
});

export const createSupplier = asyncHandler(async (req, res) => {
  const data = supplierSchema.parse(req.body);
  const supplier = await Supplier.create(data);
  res.status(201).json({
    supplier: {
      id: String(supplier._id),
      ...data,
      totalPurchases: 0,
      totalPaid: 0,
      outstanding: 0,
      paymentStatus: "unpaid",
    },
  });
});

export const getSupplier = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError("Supplier not found.", 404);
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) throw new AppError("Supplier not found.", 404);
  const totals = await getSupplierTotals([supplier._id]);
  const t = totals.get(String(supplier._id)) ?? emptyTotals();
  res.json({
    supplier: {
      id: String(supplier._id),
      name: supplier.name,
      businessName: supplier.businessName,
      mobile: supplier.mobile,
      city: supplier.city,
      address: supplier.address,
      notes: supplier.notes,
      supplierType: supplier.supplierType,
      categories: supplier.categories,
      preferredPaymentMethod: supplier.preferredPaymentMethod,
      otherCategory: supplier.otherCategory,
      totalPurchases: t.totalPurchases,
      totalPaid: t.totalPaid,
      outstanding: t.outstanding,
      paymentStatus: t.status,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
    },
  });
});

export const updateSupplier = asyncHandler(async (req, res) => {
  const data = supplierSchema.parse(req.body);
  const supplier = await Supplier.findByIdAndUpdate(req.params.id, data, { new: true });
  if (!supplier) throw new AppError("Supplier not found.", 404);
  res.json({
    supplier: {
      id: String(supplier._id),
      name: supplier.name,
      businessName: supplier.businessName,
      mobile: supplier.mobile,
      city: supplier.city,
      address: supplier.address,
      notes: supplier.notes,
      supplierType: supplier.supplierType,
      categories: supplier.categories,
      preferredPaymentMethod: supplier.preferredPaymentMethod,
      otherCategory: supplier.otherCategory,
    },
  });
});

export const deleteSupplier = asyncHandler(async (req, res) => {
  const id = req.params.id;
  if (!mongoose.isValidObjectId(id)) throw new AppError("Supplier not found.", 404);

  await withOptionalTransaction(async (session) => {
    const supplier = await Supplier.findById(id).session(session);
    if (!supplier) throw new AppError("Supplier not found.", 404);

    const purchases = await Purchase.find({ supplierId: supplier._id })
      .select("_id")
      .session(session);
    const payments = await SupplierPayment.find({ supplierId: supplier._id })
      .select("_id")
      .session(session);

    await FinancialTransaction.deleteMany({
      $or: [
        { referenceType: "supplier_payment", referenceId: { $in: payments.map((p) => String(p._id)) } },
        { referenceType: "purchase_payment", referenceId: { $in: purchases.map((p) => String(p._id)) } },
      ],
    }).session(session);
    await Ledger.deleteMany({ supplierId: supplier._id }).session(session);
    await SupplierPayment.deleteMany({ supplierId: supplier._id }).session(session);
    await Purchase.deleteMany({ supplierId: supplier._id }).session(session);
    await Supplier.deleteOne({ _id: supplier._id }).session(session);
  });

  res.json({ ok: true });
});
