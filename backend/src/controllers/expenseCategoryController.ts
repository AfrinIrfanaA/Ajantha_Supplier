import { z } from "zod";
import { ExpenseCategory } from "../models/ExpenseCategory.js";
import { Purchase } from "../models/Purchase.js";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const schema = z.object({
  name: z.string().trim().min(1, "Category name is required."),
});

export const listCategories = asyncHandler(async (_req, res) => {
  const categories = await ExpenseCategory.find().sort({ name: 1 });
  res.json({ categories });
});

export const createCategory = asyncHandler(async (req, res) => {
  const { name } = schema.parse(req.body);
  const category = await ExpenseCategory.create({ name });
  res.status(201).json({ category });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const { name } = schema.parse(req.body);
  const category = await ExpenseCategory.findByIdAndUpdate(req.params.id, { name }, { new: true });
  if (!category) throw new AppError("Category not found.", 404);
  res.json({ category });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const category = await ExpenseCategory.findById(req.params.id);
  if (!category) throw new AppError("Category not found.", 404);
  const used = await Purchase.countDocuments({ "items.category": category.name.toLowerCase() });
  if (used > 0) {
    throw new AppError("This category cannot be deleted because it is used by existing records.", 409);
  }
  await category.deleteOne();
  res.json({ ok: true });
});
