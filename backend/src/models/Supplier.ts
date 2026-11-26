import mongoose, { Schema } from "mongoose";

export const SUPPLIER_TYPES = [
  "manufacturer",
  "wholesaler",
  "distributor",
  "retailer",
  "other",
] as const;

export const PRODUCT_CATEGORIES = [
  "frocks",
  "chudidhars",
  "modern_dress",
  "shirts_girls_boys",
  "pants_girls_boys",
  "sarwani",
  "kids_dress",
  "feeding_bottle",
  "cycle",
  "pampers",
  "bed",
  "toys",
  "soap",
  "powder",
  "gift_box",
  "other",
] as const;

export type SupplierType = (typeof SUPPLIER_TYPES)[number];
export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export interface SupplierDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  businessName: string;
  mobile: string;
  city: string;
  address: string;
  notes: string;
  supplierType: SupplierType;
  categories: ProductCategory[];
  preferredPaymentMethod: string;
  otherCategory: string;
  createdAt: Date;
  updatedAt: Date;
}

const supplierSchema = new Schema<SupplierDoc>(
  {
    name: { type: String, required: true, trim: true },
    businessName: { type: String, default: "", trim: true },
    mobile: { type: String, default: "", trim: true },
    city: { type: String, default: "", trim: true },
    address: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
    supplierType: { type: String, enum: SUPPLIER_TYPES, default: "other" },
    categories: [{ type: String, enum: PRODUCT_CATEGORIES }],
    preferredPaymentMethod: { type: String, default: "cash" },
    otherCategory: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

supplierSchema.index({ name: "text", businessName: "text", mobile: "text" });

export const Supplier = mongoose.model<SupplierDoc>("Supplier", supplierSchema);
