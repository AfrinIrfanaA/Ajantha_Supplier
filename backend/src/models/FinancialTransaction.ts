import mongoose, { Schema } from "mongoose";

export type FinancialAccount = "cash" | "bank" | "gpay" | "cheque";

export interface FinancialTransactionDoc {
  _id: mongoose.Types.ObjectId;
  date: Date;
  account: FinancialAccount;
  direction: "in" | "out";
  amount: number;
  referenceType: "purchase_payment" | "supplier_payment" | "opening";
  referenceId: string;
  notes: string;
  createdAt: Date;
}

const schema = new Schema<FinancialTransactionDoc>(
  {
    date: { type: Date, required: true },
    account: { type: String, enum: ["cash", "bank", "gpay", "cheque"], required: true },
    direction: { type: String, enum: ["in", "out"], required: true },
    amount: { type: Number, required: true },
    referenceType: {
      type: String,
      enum: ["purchase_payment", "supplier_payment", "opening"],
      required: true,
    },
    referenceId: { type: String, required: true },
    notes: { type: String, default: "" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

schema.index({ referenceType: 1, referenceId: 1, account: 1 }, { unique: true });

export const FinancialTransaction = mongoose.model<FinancialTransactionDoc>(
  "FinancialTransaction",
  schema
);
