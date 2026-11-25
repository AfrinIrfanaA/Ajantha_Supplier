import mongoose, { Schema } from "mongoose";

export interface LedgerDoc {
  _id: mongoose.Types.ObjectId;
  supplierId: mongoose.Types.ObjectId;
  date: Date;
  transactionType: "purchase" | "payment";
  referenceId: mongoose.Types.ObjectId;
  reference: string;
  debit: number;
  credit: number;
  balance: number;
  createdAt: Date;
}

const schema = new Schema<LedgerDoc>(
  {
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
    date: { type: Date, required: true },
    transactionType: { type: String, enum: ["purchase", "payment"], required: true },
    referenceId: { type: Schema.Types.ObjectId, required: true },
    reference: { type: String, required: true },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    balance: { type: Number, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

schema.index({ supplierId: 1, date: 1, createdAt: 1 });
schema.index({ referenceId: 1, transactionType: 1 }, { unique: true });

export const Ledger = mongoose.model<LedgerDoc>("Ledger", schema);
