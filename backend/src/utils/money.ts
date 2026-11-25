export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function paymentStatus(outstanding: number, paid: number): "paid" | "partial" | "unpaid" {
  if (outstanding <= 0.009 && paid > 0) return "paid";
  if (outstanding <= 0.009 && paid <= 0) return "paid";
  if (paid > 0 && outstanding > 0) return "partial";
  return "unpaid";
}
