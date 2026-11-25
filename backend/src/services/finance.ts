import type { ClientSession } from "mongoose";
import { FinancialTransaction, type FinancialAccount } from "../models/FinancialTransaction.js";
import { Settings } from "../models/Settings.js";
import { insertOne } from "./insert.js";
import { paymentStatus, roundMoney } from "../utils/money.js";

export function methodToAccount(method: string): FinancialAccount {
  const key = method.toLowerCase().replace(/\s+/g, "_");
  if (key === "cash") return "cash";
  if (key === "gpay") return "gpay";
  if (key === "cheque") return "cheque";
  return "bank";
}

export async function recordOutgoingPayment(params: {
  date: Date;
  method: string;
  amount: number;
  referenceType: "purchase_payment" | "supplier_payment";
  referenceId: string;
  notes?: string;
  session: ClientSession | null;
}) {
  const account = methodToAccount(params.method);
  const existing = await FinancialTransaction.findOne({
    referenceType: params.referenceType,
    referenceId: params.referenceId,
    account,
  }).session(params.session);
  if (existing) return existing;

  return insertOne(FinancialTransaction, {
    date: params.date,
    account,
    direction: "out",
    amount: roundMoney(params.amount),
    referenceType: params.referenceType,
    referenceId: params.referenceId,
    notes: params.notes ?? "",
  }, params.session);
}

export async function getFinancialSummary() {
  const settings = await Settings.findOne();
  const txs = await FinancialTransaction.find();
  let cash = settings?.openingCashBalance ?? 0;
  let bank = settings?.openingBankBalance ?? 0;
  let gpay = 0;
  let cheque = 0;

  for (const tx of txs) {
    const signed = tx.direction === "out" ? -tx.amount : tx.amount;
    if (tx.account === "cash") cash += signed;
    if (tx.account === "bank") bank += signed;
    if (tx.account === "gpay") gpay += signed;
    if (tx.account === "cheque") cheque += signed;
  }

  return {
    cash: roundMoney(cash),
    bank: roundMoney(bank),
    gpay: roundMoney(gpay),
    cheque: roundMoney(cheque),
    digital: roundMoney(gpay),
  };
}

export { paymentStatus, roundMoney };
