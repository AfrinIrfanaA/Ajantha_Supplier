import ExcelJS from "exceljs";
import type { Response } from "express";
import PDFDocument from "pdfkit";
import { fileURLToPath } from "node:url";
import { ExpenseCategory } from "../models/ExpenseCategory.js";
import { FinancialTransaction } from "../models/FinancialTransaction.js";
import { Ledger } from "../models/Ledger.js";
import { PaymentMethod } from "../models/PaymentMethod.js";
import { Purchase } from "../models/Purchase.js";
import { Settings } from "../models/Settings.js";
import { Supplier } from "../models/Supplier.js";
import { SupplierPayment } from "../models/SupplierPayment.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";

function addWorksheet(workbook: ExcelJS.Workbook, name: string, records: object[]) {
  const worksheet = workbook.addWorksheet(name);
  const keys = [...new Set(records.flatMap((record) => Object.keys(record)))];

  if (keys.length === 0) {
    worksheet.addRow(["No records"]);
    return;
  }

  worksheet.columns = keys.map((key) => ({
    header: key,
    key,
    width: Math.min(Math.max(key.length + 2, 14), 32),
  }));
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.getRow(1).font = { bold: true };

  for (const record of records) {
    const values = new Map(Object.entries(record));
    worksheet.addRow(
      keys.map((key) => {
        const value = values.get(key);
        if (value == null) return "";
        if (
          value instanceof Date ||
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean"
        ) {
          return value;
        }
        return JSON.stringify(value) ?? String(value);
      })
    );
  }

  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: records.length + 1, column: keys.length },
  };
}

function writeMixedText(
  doc: PDFKit.PDFDocument,
  text: string,
  options: PDFKit.Mixins.TextOptions
) {
  const segments = text.match(/[\u0B80-\u0BFF₹]+|[^\u0B80-\u0BFF₹]+/g) ?? [text];
  segments.forEach((segment, index) => {
    doc.font(/[\u0B80-\u0BFF₹]/.test(segment) ? "Tamil" : "Latin");
    doc.text(segment, { ...options, continued: index < segments.length - 1 });
  });
}

function addPdfLine(doc: PDFKit.PDFDocument, text: string, width: number) {
  const height = doc.heightOfString(text, { width }) + 4;
  if (doc.y + height > doc.page.height - 42) doc.addPage();
  writeMixedText(doc, text, { width });
  doc.moveDown(0.25);
}

function createPdfReport(payload: BackupPayload, res: Response) {
  const doc = new PDFDocument({ size: "A4", margin: 42 });
  const fontDirectory = fileURLToPath(
    new URL("../../node_modules/@fontsource/noto-sans-tamil/files/", import.meta.url)
  );
  doc.registerFont("Latin", `${fontDirectory}noto-sans-tamil-latin-400-normal.woff`);
  doc.registerFont("Tamil", `${fontDirectory}noto-sans-tamil-tamil-400-normal.woff`);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="supplier-manager-backup-${new Date().toISOString().slice(0, 10)}.pdf"`
  );
  doc.pipe(res);

  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  doc.font("Latin").fontSize(18);
  writeMixedText(doc, "AJANTHA TEXTILES - Backup Report", { width });
  doc.moveDown(0.5);
  doc.fontSize(9);
  addPdfLine(doc, `Generated: ${payload.generatedAt}`, width);
  addPdfLine(
    doc,
    `Suppliers: ${payload.suppliers.length} | Purchases: ${payload.purchases.length} | Payments: ${payload.supplierPayments.length}`,
    width
  );

  const totalPurchases = payload.purchases.reduce((sum, purchase) => sum + purchase.grandTotal, 0);
  const totalPaid = payload.purchases.reduce((sum, purchase) => sum + purchase.paidAmount, 0);
  const totalOutstanding = payload.purchases.reduce(
    (sum, purchase) => sum + purchase.outstandingAmount,
    0
  );
  const formatMoney = (amount: number) =>
    `₹${new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2 }).format(amount)}`;

  doc.fontSize(12).font("Latin");
  doc.text("Financial Summary", { width });
  doc.fontSize(9);
  addPdfLine(doc, `Purchase total: ${formatMoney(totalPurchases)}`, width);
  addPdfLine(doc, `Amount paid: ${formatMoney(totalPaid)}`, width);
  addPdfLine(doc, `Outstanding: ${formatMoney(totalOutstanding)}`, width);

  const collections = [
    ["Suppliers", payload.suppliers.length],
    ["Purchases", payload.purchases.length],
    ["Purchase Items", payload.purchaseItems.length],
    ["Supplier Payments", payload.supplierPayments.length],
    ["Supplier Ledger", payload.supplierLedger.length],
    ["Financial Transactions", payload.financialTransactions.length],
    ["Settings", payload.settings.length],
    ["Users", payload.users.length],
    ["Payment Methods", payload.paymentMethods.length],
    ["Expense Categories", payload.expenseCategories.length],
  ] as const;
  doc.fontSize(12).font("Latin");
  doc.text("Backup Contents", { width });
  doc.fontSize(9);
  for (const [name, count] of collections) addPdfLine(doc, `${name}: ${count}`, width);

  doc.addPage();
  doc.fontSize(12).font("Latin");
  doc.text("Supplier Directory", { width });
  doc.fontSize(8);
  for (const supplier of payload.suppliers) {
    const categories = (supplier.categories ?? []).join(", ");
    const details = [
      supplier.name,
      supplier.businessName,
      supplier.mobile,
      supplier.city,
      supplier.supplierType,
      categories,
    ].filter(Boolean);
    addPdfLine(doc, details.join(" | "), width);
  }

  doc.addPage();
  doc.fontSize(12).font("Latin");
  doc.text("Purchase History", { width });
  doc.fontSize(8);
  for (const purchase of payload.purchases) {
    addPdfLine(
      doc,
      [
        purchase.purchaseDate.toISOString().slice(0, 10),
        purchase.invoiceNumber,
        `Supplier: ${String(purchase.supplierId)}`,
        `Total: ${formatMoney(purchase.grandTotal)}`,
        `Paid: ${formatMoney(purchase.paidAmount)}`,
        `Balance: ${formatMoney(purchase.outstandingAmount)}`,
      ].join(" | "),
      width
    );
  }

  doc.addPage();
  doc.fontSize(12).font("Latin");
  doc.text("Supplier Payments", { width });
  doc.fontSize(8);
  for (const payment of payload.supplierPayments) {
    addPdfLine(
      doc,
      [
        payment.paymentDate.toISOString().slice(0, 10),
        `Supplier: ${String(payment.supplierId)}`,
        `Amount: ${formatMoney(payment.amount)}`,
        payment.paymentMethod,
        payment.referenceNumber,
      ]
        .filter(Boolean)
        .join(" | "),
      width
    );
  }

  doc.end();
}

type SupplierBackupRecord = {
  name: string;
  businessName: string;
  mobile: string;
  city: string;
  supplierType: string;
  categories: string[];
};

type PurchaseBackupRecord = {
  _id: unknown;
  supplierId: unknown;
  invoiceNumber: string;
  purchaseDate: Date;
  grandTotal: number;
  paidAmount: number;
  outstandingAmount: number;
  items?: object[];
};

type SupplierPaymentBackupRecord = {
  supplierId: unknown;
  paymentDate: Date;
  amount: number;
  paymentMethod: string;
  referenceNumber: string;
};

type BackupPayload = {
  generatedAt: string;
  app: string;
  suppliers: SupplierBackupRecord[];
  purchases: PurchaseBackupRecord[];
  supplierPayments: SupplierPaymentBackupRecord[];
  purchaseItems: object[];
  supplierLedger: object[];
  cashRecords: object[];
  bankRecords: object[];
  chequeRecords: object[];
  financialTransactions: object[];
  settings: object[];
  users: object[];
  paymentMethods: object[];
  expenseCategories: object[];
};

export const downloadBackup = asyncHandler(async (req, res) => {
  const format = req.query.format ?? "json";
  if (format !== "json" && format !== "xlsx" && format !== "pdf") {
    res.status(400).json({ message: "Unsupported backup format. Use json, xlsx, or pdf." });
    return;
  }

  const [
    suppliers,
    purchases,
    supplierPayments,
    ledger,
    settings,
    users,
    paymentMethods,
    expenseCategories,
    financialTransactions,
  ] = await Promise.all([
    Supplier.find().lean(),
    Purchase.find().lean(),
    SupplierPayment.find().lean(),
    Ledger.find().lean(),
    Settings.find().lean(),
    User.find().select("-passwordHash").lean(),
    PaymentMethod.find().lean(),
    ExpenseCategory.find().lean(),
    FinancialTransaction.find().lean(),
  ]);

  const purchaseItems = purchases.flatMap((p) =>
    (p.items ?? []).map((item) => ({ purchaseId: p._id, ...item }))
  );

  const payload: BackupPayload = {
    generatedAt: new Date().toISOString(),
    app: "AJANTHA TEXTILES",
    suppliers,
    purchases,
    purchaseItems,
    supplierPayments,
    supplierLedger: ledger,
    cashRecords: financialTransactions.filter((t) => t.account === "cash"),
    bankRecords: financialTransactions.filter((t) => t.account === "bank" || t.account === "gpay"),
    chequeRecords: financialTransactions.filter((t) => t.account === "cheque"),
    financialTransactions,
    settings,
    users,
    paymentMethods,
    expenseCategories,
  };

  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "xlsx") {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "AJANTHA TEXTILES";
    workbook.created = new Date();
    const collections: Array<[string, object[]]> = [
      ["Suppliers", payload.suppliers],
      ["Purchases", payload.purchases],
      ["Purchase Items", payload.purchaseItems],
      ["Payments", payload.supplierPayments],
      ["Supplier Ledger", payload.supplierLedger],
      ["Cash Records", payload.cashRecords],
      ["Bank Records", payload.bankRecords],
      ["Cheque Records", payload.chequeRecords],
      ["Financial Transactions", payload.financialTransactions],
      ["Settings", payload.settings],
      ["Users", payload.users],
      ["Payment Methods", payload.paymentMethods],
      ["Expense Categories", payload.expenseCategories],
    ];

    const summary = workbook.addWorksheet("Backup Info");
    summary.addRows([
      ["Application", payload.app],
      ["Generated At", payload.generatedAt],
      ["Users", "Password hashes excluded"],
    ]);
    for (const [name, records] of collections) addWorksheet(workbook, name, records);

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="supplier-manager-backup-${stamp}.xlsx"`
    );
    await workbook.xlsx.write(res);
    res.end();
    return;
  }

  if (format === "pdf") {
    createPdfReport(payload, res);
    return;
  }

  res.setHeader("Content-Type", "application/json");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="supplier-manager-backup-${stamp}.json"`
  );
  res.send(JSON.stringify(payload, null, 2));
});
