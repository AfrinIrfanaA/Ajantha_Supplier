export function formatMoney(value: number | undefined | null) {
  const n = Number(value ?? 0);
  return `₹${new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(n)}`;
}

export function formatDate(value: string | Date | undefined | null) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
