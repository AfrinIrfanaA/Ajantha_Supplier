import mongoose, { Schema } from "mongoose";
import { PRODUCT_CATEGORIES, type ProductCategory } from "./Supplier.js";

export interface PurchaseItem {
  productName: string;
  category: ProductCategory;
  quantity: number;
  rate: number;
  discount: number;
  total: number;
}

export interface PurchaseDoc {
  _id: mongoose.Types.ObjectId;
  supplierId: mongoose.Types.ObjectId;
  invoiceNumber: string;
  purchaseDate: Date;
  items: PurchaseItem[];
  subtotal: number;
  discount: number;
  otherCharges: number;
  grandTotal: number;
  paidAmount: number;
  outstandingAmount: number;
  paymentMethod: string;
  status: "paid" | "partial" | "unpaid";
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

const itemSchema = new Schema<PurchaseItem>(
  {
    productName: { type: String, required: true, trim: true },
    category: { type: String, enum: PRODUCT_CATEGORIES, required: true },
    quantity: { type: Number, required: true, min: 0 },
    rate: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const purchaseSchema = new Schema<PurchaseDoc>(
  {
    supplierId: { type: Schema.Types.ObjectId, ref: "Supplier", required: true, index: true },
    invoiceNumber: { type: String, required: true, unique: true, trim: true },
    purchaseDate: { type: Date, required: true },
    items: { type: [itemSchema], required: true },
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    otherCharges: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    outstandingAmount: { type: Number, required: true },
    paymentMethod: { type: String, default: "" },
    status: { type: String, enum: ["paid", "partial", "unpaid"], required: true },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

export const Purchase = mongoose.model<PurchaseDoc>("Purchase", purchaseSchema);
