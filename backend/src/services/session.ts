import type { ClientSession } from "mongoose";
import mongoose from "mongoose";

export async function withOptionalTransaction<T>(
  fn: (session: ClientSession | null) => Promise<T>
): Promise<T> {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (err) {
    try {
      await session.abortTransaction();
    } catch {
      /* ignore */
    }
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("Transaction numbers are only allowed") || message.includes("replica set")) {
      return fn(null);
    }
    throw err;
  } finally {
    session.endSession();
  }
}
