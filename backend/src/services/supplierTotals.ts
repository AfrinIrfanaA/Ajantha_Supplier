import mongoose from "mongoose";
import { Purchase } from "../models/Purchase.js";
import { paymentStatus, roundMoney } from "../utils/money.js";

export async function getSupplierTotals(supplierIds?: mongoose.Types.ObjectId[]) {
  const match = supplierIds?.length ? { supplierId: { $in: supplierIds } } : {};
  const rows = await Purchase.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$supplierId",
        totalPurchases: { $sum: "$grandTotal" },
        totalPaid: { $sum: "$paidAmount" },
        outstanding: { $sum: "$outstandingAmount" },
        firstPurchase: { $min: "$purchaseDate" },
        lastPurchase: { $max: "$purchaseDate" },
      },
    },
  ]);

  const map = new Map<
    string,
    {
      totalPurchases: number;
      totalPaid: number;
      outstanding: number;
      status: "paid" | "partial" | "unpaid";
      firstPurchase: Date;
      lastPurchase: Date;
    }
  >();

  for (const row of rows) {
    const totalPurchases = roundMoney(row.totalPurchases);
    const totalPaid = roundMoney(row.totalPaid);
    const outstanding = roundMoney(row.outstanding);
    map.set(String(row._id), {
      totalPurchases,
      totalPaid,
      outstanding,
      status: paymentStatus(outstanding, totalPaid),
      firstPurchase: row.firstPurchase,
      lastPurchase: row.lastPurchase,
    });
  }
  return map;
}

export function emptyTotals() {
  return {
    totalPurchases: 0,
    totalPaid: 0,
    outstanding: 0,
    status: "unpaid" as const,
    firstPurchase: null as Date | null,
    lastPurchase: null as Date | null,
  };
}
