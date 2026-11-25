import mongoose, { Schema } from "mongoose";

export interface SettingsDoc {
  _id: mongoose.Types.ObjectId;
  shopName: string;
  city: string;
  address: string;
  mobile: string;
  openingCashBalance: number;
  openingBankBalance: number;
  openingDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<SettingsDoc>(
  {
    shopName: { type: String, default: "AJANTHA TEXTILES" },
    city: { type: String, default: "" },
    address: { type: String, default: "" },
    mobile: { type: String, default: "" },
    openingCashBalance: { type: Number, default: 0 },
    openingBankBalance: { type: Number, default: 0 },
    openingDate: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Settings = mongoose.model<SettingsDoc>("Settings", schema);
