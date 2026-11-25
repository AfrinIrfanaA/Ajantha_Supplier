import type { ClientSession, Model } from "mongoose";

export async function insertOne<T>(
  model: Model<T>,
  doc: object,
  session: ClientSession | null
): Promise<T> {
  if (session) {
    const created = await model.create([doc], { session });
    return created[0] as T;
  }
  return (await model.create(doc)) as T;
}
