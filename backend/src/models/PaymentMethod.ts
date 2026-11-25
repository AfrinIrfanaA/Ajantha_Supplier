import mongoose, { Schema } from "mongoose";

export interface PaymentMethodDoc {
  _id: mongoose.Types.ObjectId;
  key: string;
  name: string;
  enabled: boolean;
}

const schema = new Schema<PaymentMethodDoc>({
  key: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  enabled: { type: Boolean, default: true },
});

export const PaymentMethod = mongoose.model<PaymentMethodDoc>("PaymentMethod", schema);
