import archiver from "archiver";
import { FinancialTransaction } from "../models/FinancialTransaction.js";
import { PaymentMethod } from "../models/PaymentMethod.js";
import { Purchase } from "../models/Purchase.js";
import { Settings } from "../models/Settings.js";
import { Supplier } from "../models/Supplier.js";
import { SupplierPayment } from "../models/SupplierPayment.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function csvEscape(value: unknown) {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(headers: string[], rows: Record<string, unknown>[]) {
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvEscape(row[h])).join(","));
  }
  return lines.join("\n");
}

export const exportData = asyncHandler(async (_req, res) => {
  const [suppliers, purchases, payments, finance, settings, users, methods] = await Promise.all([
    Supplier.find().lean(),
    Purchase.find().lean(),
    SupplierPayment.find().lean(),
    FinancialTransaction.find().lean(),
    Settings.find().lean(),
    User.find().select("-passwordHash").lean(),
    PaymentMethod.find().lean(),
  ]);

  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="ajantha-export-${stamp}.zip"`);

  const archive = archiver("zip", { zlib: { level: 9 } });
  archive.on("error", (err) => {
    throw err;
  });
  archive.pipe(res);

  archive.append(
    toCsv(
      ["id", "name", "businessName", "mobile", "city", "supplierType", "categories", "preferredPaymentMethod"],
      suppliers.map((s) => ({
        id: s._id,
        name: s.name,
        businessName: s.businessName,
        mobile: s.mobile,
        city: s.city,
        supplierType: s.supplierType,
        categories: (s.categories ?? []).join("|"),
        preferredPaymentMethod: s.preferredPaymentMethod,
      }))
    ),
    { name: "suppliers.csv" }
  );

  archive.append(
    toCsv(
      [
        "id",
        "supplierId",
        "invoiceNumber",
        "purchaseDate",
        "grandTotal",
        "paidAmount",
        "outstandingAmount",
        "paymentMethod",
        "status",
      ],
      purchases.map((p) => ({
        id: p._id,
        supplierId: p.supplierId,
        invoiceNumber: p.invoiceNumber,
        purchaseDate: p.purchaseDate,
        grandTotal: p.grandTotal,
        paidAmount: p.paidAmount,
        outstandingAmount: p.outstandingAmount,
        paymentMethod: p.paymentMethod,
        status: p.status,
      }))
    ),
    { name: "purchases.csv" }
  );

  archive.append(
    toCsv(
      ["id", "supplierId", "paymentDate", "amount", "paymentMethod", "referenceNumber", "notes"],
      payments.map((p) => ({
        id: p._id,
        supplierId: p.supplierId,
        paymentDate: p.paymentDate,
        amount: p.amount,
        paymentMethod: p.paymentMethod,
        referenceNumber: p.referenceNumber,
        notes: p.notes,
      }))
    ),
    { name: "payments.csv" }
  );

  archive.append(
    toCsv(
      ["id", "date", "account", "direction", "amount", "referenceType", "referenceId", "notes"],
      finance.map((t) => ({
        id: t._id,
        date: t.date,
        account: t.account,
        direction: t.direction,
        amount: t.amount,
        referenceType: t.referenceType,
        referenceId: t.referenceId,
        notes: t.notes,
      }))
    ),
    { name: "cash_bank.csv" }
  );

  archive.append(JSON.stringify(settings, null, 2), { name: "settings.json" });
  archive.append(
    JSON.stringify(
      users.map((u) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
      })),
      null,
      2
    ),
    { name: "users.json" }
  );
  archive.append(JSON.stringify(methods, null, 2), { name: "payment-methods.json" });

  await archive.finalize();
});
