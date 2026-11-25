import { Purchase } from "../models/Purchase.js";
import { Supplier } from "../models/Supplier.js";
import { SupplierPayment } from "../models/SupplierPayment.js";
import { getFinancialSummary } from "../services/finance.js";
import { emptyTotals, getSupplierTotals } from "../services/supplierTotals.js";
import { roundMoney } from "../utils/money.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getDashboard = asyncHandler(async (_req, res) => {
  const [supplierCount, purchases, payments, totalsMap, finance] = await Promise.all([
    Supplier.countDocuments(),
    Purchase.find().populate("supplierId", "name").sort({ purchaseDate: -1, createdAt: -1 }).limit(8),
    SupplierPayment.find()
      .populate("supplierId", "name")
      .sort({ paymentDate: -1, createdAt: -1 })
      .limit(8),
    getSupplierTotals(),
    getFinancialSummary(),
  ]);

  let totalPurchases = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  let paid = 0;
  let partial = 0;
  let unpaid = 0;

  const outstandingSuppliers: Array<{
    id: string;
    name: string;
    totalPurchases: number;
    totalPaid: number;
    outstanding: number;
  }> = [];

  const suppliers = await Supplier.find();
  for (const s of suppliers) {
    const t = totalsMap.get(String(s._id)) ?? emptyTotals();
    totalPurchases += t.totalPurchases;
    totalPaid += t.totalPaid;
    totalOutstanding += t.outstanding;
    if (t.totalPurchases === 0) unpaid += 1;
    else if (t.status === "paid") paid += 1;
    else if (t.status === "partial") partial += 1;
    else unpaid += 1;
    if (t.outstanding > 0) {
      outstandingSuppliers.push({
        id: String(s._id),
        name: s.name,
        totalPurchases: t.totalPurchases,
        totalPaid: t.totalPaid,
        outstanding: t.outstanding,
      });
    }
  }

  outstandingSuppliers.sort((a, b) => b.outstanding - a.outstanding);

  res.json({
    summary: {
      totalSuppliers: supplierCount,
      totalPurchases: roundMoney(totalPurchases),
      totalPaid: roundMoney(totalPaid),
      totalOutstanding: roundMoney(totalOutstanding),
    },
    paymentStatus: { paid, partial, unpaid },
    finance,
    recentPurchases: purchases.map((p) => ({
      id: String(p._id),
      supplier:
        p.supplierId && typeof p.supplierId === "object" && "name" in p.supplierId
          ? (p.supplierId as { name: string }).name
          : "",
      invoiceNumber: p.invoiceNumber,
      date: p.purchaseDate,
      totalAmount: p.grandTotal,
      paidAmount: p.paidAmount,
      outstanding: p.outstandingAmount,
      paymentStatus: p.status,
    })),
    recentPayments: payments.map((p) => ({
      id: String(p._id),
      supplier:
        p.supplierId && typeof p.supplierId === "object" && "name" in p.supplierId
          ? (p.supplierId as { name: string }).name
          : "",
      amount: p.amount,
      paymentMethod: p.paymentMethod,
      date: p.paymentDate,
    })),
    outstandingSuppliers: outstandingSuppliers.slice(0, 8),
  });
});
