import type { ClientSession } from "mongoose";
import mongoose from "mongoose";
import { Ledger } from "../models/Ledger.js";
import { insertOne } from "./insert.js";
import { roundMoney } from "../utils/money.js";

export async function appendLedger(params: {
  supplierId: mongoose.Types.ObjectId;
  date: Date;
  transactionType: "purchase" | "payment";
  referenceId: mongoose.Types.ObjectId;
  reference: string;
  debit: number;
  credit: number;
  session: ClientSession | null;
}) {
  const last = await Ledger.findOne({ supplierId: params.supplierId })
    .sort({ date: -1, createdAt: -1 })
    .session(params.session);
  const prev = last?.balance ?? 0;
  const balance = roundMoney(prev + params.debit - params.credit);

  return insertOne(Ledger, {
    supplierId: params.supplierId,
    date: params.date,
    transactionType: params.transactionType,
    referenceId: params.referenceId,
    reference: params.reference,
    debit: roundMoney(params.debit),
    credit: roundMoney(params.credit),
    balance,
  }, params.session);
}

export async function rebuildSupplierLedger(
  supplierId: mongoose.Types.ObjectId,
  session: ClientSession | null
) {
  const entries = await Ledger.find({ supplierId })
    .sort({ date: 1, createdAt: 1 })
    .session(session);
  let balance = 0;
  for (const entry of entries) {
    balance = roundMoney(balance + entry.debit - entry.credit);
    entry.balance = balance;
    await entry.save({ session: session ?? undefined });
  }
}
