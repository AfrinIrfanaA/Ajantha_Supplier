import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { connectDb } from "./db/connect.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { router } from "./routes/index.js";
import { User } from "./models/User.js";
import bcrypt from "bcryptjs";
import { PaymentMethod } from "./models/PaymentMethod.js";
import { ExpenseCategory } from "./models/ExpenseCategory.js";
import { Settings } from "./models/Settings.js";

const app = express();
const normalizeOrigin = (origin: string) => origin.trim().replace(/\/+$/, "");
const allowedOrigins = new Set([
  "https://ajantha-supplier.vercel.app",
  ...env.clientOrigin.split(",").map(normalizeOrigin),
]);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(normalizeOrigin(origin))) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());
app.use("/api", router);
app.use(errorHandler);

async function ensureSeed() {
  const ownerCount = await User.countDocuments({ role: "owner" });
  if (ownerCount === 0) {
    await User.create({
      name: env.ownerName,
      email: env.ownerEmail.toLowerCase(),
      passwordHash: await bcrypt.hash(env.ownerPassword, 12),
      role: "owner",
      status: "active",
    });
    console.log(`Owner account created: ${env.ownerEmail}`);
  } else {
    const owner = await User.findOne({ role: "owner", email: env.ownerEmail.toLowerCase() });
    if (owner) {
      const passwordMatches = await bcrypt.compare(env.ownerPassword, owner.passwordHash);
      if (!passwordMatches) {
        owner.passwordHash = await bcrypt.hash(env.ownerPassword, 12);
        owner.status = "active";
        await owner.save();
        console.log(`Owner credentials synchronized: ${env.ownerEmail}`);
      }
    }
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
  for (const name of ["Rent", "Electricity", "Transport", "Packing", "Other"]) {
    await ExpenseCategory.updateOne({ name }, { $setOnInsert: { name } }, { upsert: true });
  }
  if (!(await Settings.findOne())) {
    await Settings.create({ shopName: "AJANTHA TEXTILES" });
  }
}

async function start() {
  await connectDb();
  await ensureSeed();
  app.listen(env.port, () => {
    console.log(`AJANTHA TEXTILES API running on http://localhost:${env.port}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
