import { Router } from "express";
import { login, logout, me } from "../controllers/authController.js";
import { getDashboard } from "../controllers/dashboardController.js";
import {
  createSupplier,
  deleteSupplier,
  getSupplier,
  listSuppliers,
  updateSupplier,
} from "../controllers/supplierController.js";
import { createPurchase, deletePurchase, getPurchase, listPurchases } from "../controllers/purchaseController.js";
import { createPayment, deletePayment, listPayments } from "../controllers/paymentController.js";
import { getLedger } from "../controllers/ledgerController.js";
import { getSettings, updateSettings } from "../controllers/settingsController.js";
import { createUser, deleteUser, listUsers, updateUser } from "../controllers/userController.js";
import { listPaymentMethods, updatePaymentMethod } from "../controllers/paymentMethodController.js";
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from "../controllers/expenseCategoryController.js";
import { downloadBackup } from "../controllers/backupController.js";
import { exportData } from "../controllers/exportController.js";
import { requireAuth, requireRoles } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const router = Router();

router.post("/auth/login", login);
router.post("/auth/logout", logout);
router.get("/auth/me", requireAuth, me);
router.get(
  "/health",
  asyncHandler(async (_req, res) => {
    res.json({ ok: true });
  })
);

router.use(requireAuth);

router.get("/dashboard", getDashboard);

router.get("/suppliers", listSuppliers);
router.post("/suppliers", requireRoles("owner", "accountant"), createSupplier);
router.get("/suppliers/:id", getSupplier);
router.put("/suppliers/:id", requireRoles("owner", "accountant"), updateSupplier);
router.delete("/suppliers/:id", requireRoles("owner", "accountant"), deleteSupplier);
router.get("/suppliers/:id/ledger", getLedger);

router.get("/purchases", listPurchases);
router.post("/purchases", requireRoles("owner", "accountant"), createPurchase);
router.get("/purchases/:id", getPurchase);
router.delete("/purchases/:id", requireRoles("owner", "accountant"), deletePurchase);

router.get("/supplier-payments", listPayments);
router.post("/supplier-payments", requireRoles("owner", "accountant"), createPayment);
router.delete("/supplier-payments/:id", requireRoles("owner", "accountant"), deletePayment);

router.get("/settings", getSettings);
router.put("/settings", requireRoles("owner"), updateSettings);

router.get("/users", requireRoles("owner"), listUsers);
router.post("/users", requireRoles("owner"), createUser);
router.put("/users/:id", requireRoles("owner"), updateUser);
router.delete("/users/:id", requireRoles("owner"), deleteUser);

router.get("/payment-methods", listPaymentMethods);
router.put("/payment-methods/:id", requireRoles("owner"), updatePaymentMethod);

router.get("/expense-categories", requireRoles("owner", "accountant"), listCategories);
router.post("/expense-categories", requireRoles("owner"), createCategory);
router.put("/expense-categories/:id", requireRoles("owner"), updateCategory);
router.delete("/expense-categories/:id", requireRoles("owner"), deleteCategory);

router.get("/backup", requireRoles("owner"), downloadBackup);
router.get("/export", requireRoles("owner", "accountant"), exportData);
