import { z } from "zod";
import { Settings } from "../models/Settings.js";
import { getFinancialSummary } from "../services/finance.js";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const schema = z.object({
  shopName: z.string().trim().optional(),
  city: z.string().trim().optional(),
  address: z.string().trim().optional(),
  mobile: z.string().trim().optional(),
  openingCashBalance: z.number().min(0).optional(),
  openingBankBalance: z.number().min(0).optional(),
  openingDate: z.string().nullable().optional(),
  confirmOpeningBalanceChange: z.boolean().optional(),
});

export async function getOrCreateSettings() {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({ shopName: "AJANTHA TEXTILES" });
  }
  return settings;
}

export const getSettings = asyncHandler(async (_req, res) => {
  const settings = await getOrCreateSettings();
  const finance = await getFinancialSummary();
  res.json({ settings, finance });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const data = schema.parse(req.body);
  const settings = await getOrCreateSettings();

  const openingChanging =
    (data.openingCashBalance != null && data.openingCashBalance !== settings.openingCashBalance) ||
    (data.openingBankBalance != null && data.openingBankBalance !== settings.openingBankBalance) ||
    (data.openingDate !== undefined &&
      String(data.openingDate ?? "") !== String(settings.openingDate ?? ""));

  if (openingChanging && !data.confirmOpeningBalanceChange) {
    throw new AppError(
      "Changing the opening balance affects all financial totals. Please confirm to continue.",
      400,
      "CONFIRM_OPENING_BALANCE"
    );
  }

  if (data.shopName != null) settings.shopName = data.shopName;
  if (data.city != null) settings.city = data.city;
  if (data.address != null) settings.address = data.address;
  if (data.mobile != null) settings.mobile = data.mobile;
  if (data.openingCashBalance != null) settings.openingCashBalance = data.openingCashBalance;
  if (data.openingBankBalance != null) settings.openingBankBalance = data.openingBankBalance;
  if (data.openingDate !== undefined) {
    settings.openingDate = data.openingDate ? new Date(data.openingDate) : null;
  }
  await settings.save();
  const finance = await getFinancialSummary();
  res.json({ settings, finance });
});
