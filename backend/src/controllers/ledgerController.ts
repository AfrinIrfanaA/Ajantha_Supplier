import { Ledger } from "../models/Ledger.js";
import { Supplier } from "../models/Supplier.js";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getLedger = asyncHandler(async (req, res) => {
  const supplier = await Supplier.findById(req.params.id);
  if (!supplier) throw new AppError("Supplier not found.", 404);

  const filter: Record<string, unknown> = { supplierId: supplier._id };
  if (req.query.type) filter.transactionType = req.query.type;
  if (req.query.dateFrom || req.query.dateTo) {
    filter.date = {
      ...(req.query.dateFrom ? { $gte: new Date(String(req.query.dateFrom)) } : {}),
      ...(req.query.dateTo ? { $lte: new Date(String(req.query.dateTo)) } : {}),
    };
  }

  const entries = await Ledger.find(filter).sort({ date: 1, createdAt: 1 });
  res.json({
    ledger: entries.map((e) => ({
      id: String(e._id),
      date: e.date,
      transactionType: e.transactionType,
      reference: e.reference,
      debit: e.debit,
      credit: e.credit,
      balance: e.balance,
    })),
  });
});
