import mongoose, { Schema } from "mongoose";

export interface ExpenseCategoryDoc {
  _id: mongoose.Types.ObjectId;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<ExpenseCategoryDoc>(
  {
    name: { type: String, required: true, unique: true, trim: true },
  },
  { timestamps: true }
);

export const ExpenseCategory = mongoose.model<ExpenseCategoryDoc>("ExpenseCategory", schema);
