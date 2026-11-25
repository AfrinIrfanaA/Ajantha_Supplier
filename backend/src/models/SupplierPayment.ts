import mongoose, { Schema } from "mongoose";

export interface SupplierPaymentDoc {
  _id: mongoose.Types.ObjectId;
  supplierId: mongoose.Types.ObjectId;
  paymentDate: Date;
  amount: number;
  paymentMethod: string;
  referenceNumber: string;
  notes: string;
  purchaseId?: mongoose.Types.ObjectId;
  isInitialPurchasePayment: boolean;
  createdAt: Date;
}

const schema = new Schema<SupplierPaymentDoc>(
  {
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
    paymentDate: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0.01 },
    paymentMethod: { type: String, required: true },
    referenceNumber: { type: String, default: "" },
    notes: { type: String, default: "" },
    purchaseId: { type: Schema.Types.ObjectId, ref: "Purchase" },
    isInitialPurchasePayment: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const SupplierPayment = mongoose.model<SupplierPaymentDoc>("SupplierPayment", schema);
