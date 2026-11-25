import bcrypt from "bcryptjs";
import { connectDb } from "./db/connect.js";
import { env } from "./config/env.js";
import { ExpenseCategory } from "./models/ExpenseCategory.js";
import { PaymentMethod } from "./models/PaymentMethod.js";
import { Settings } from "./models/Settings.js";
import { User } from "./models/User.js";

async function seed() {
  await connectDb();

  const ownerCount = await User.countDocuments({ role: "owner" });
  if (ownerCount === 0) {
    const passwordHash = await bcrypt.hash(env.ownerPassword, 12);
    await User.create({
      name: env.ownerName,
      email: env.ownerEmail.toLowerCase(),
      passwordHash,
      role: "owner",
      status: "active",
    });
    console.log(`Owner created: ${env.ownerEmail}`);
  }

  const methods = [
    { key: "cash", name: "Cash" },
    { key: "bank_transfer", name: "Bank Transfer" },
    { key: "gpay", name: "GPay" },
    { key: "cheque", name: "Cheque" },
  ];
  for (const m of methods) {
    await PaymentMethod.updateOne(m, { $setOnInsert: { enabled: true } }, { upsert: true });
  }

  const categories = ["Rent", "Electricity", "Transport", "Packing", "Other"];
  for (const name of categories) {
    await ExpenseCategory.updateOne({ name }, { $setOnInsert: { name } }, { upsert: true });
  }

  const settings = await Settings.findOne();
  if (!settings) {
    await Settings.create({ shopName: "AJANTHA TEXTILES" });
  }

  console.log("Seed complete");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
