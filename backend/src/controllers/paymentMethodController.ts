import { Purchase } from "../models/Purchase.js";
import { SupplierPayment } from "../models/SupplierPayment.js";
import { PaymentMethod } from "../models/PaymentMethod.js";
import { AppError } from "../utils/appError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const listPaymentMethods = asyncHandler(async (_req, res) => {
  const methods = await PaymentMethod.find().sort({ name: 1 });
  res.json({ paymentMethods: methods });
});

export const updatePaymentMethod = asyncHandler(async (req, res) => {
  const method = await PaymentMethod.findById(req.params.id);
  if (!method) throw new AppError("Payment method not found.", 404);
  const enabled = Boolean(req.body.enabled);

  if (!enabled && method.enabled) {
    const confirm = Boolean(req.body.confirm);
    const [pCount, payCount] = await Promise.all([
      Purchase.countDocuments({ paymentMethod: method.key }),
      SupplierPayment.countDocuments({ paymentMethod: method.key }),
    ]);
    if ((pCount > 0 || payCount > 0) && !confirm) {
      throw new AppError(
        "This payment method is used by existing records. Confirm to disable it.",
        400,
        "CONFIRM_DISABLE_METHOD"
      );
    }
  }

  method.enabled = enabled;
  await method.save();
  res.json({ paymentMethod: method });
});
