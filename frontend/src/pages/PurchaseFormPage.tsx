import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ApiError, api } from "../api/client";
import { Button, Card, FieldError, Input, Label, Select, Textarea } from "../components/ui";
import { useToast } from "../context/ToastContext";
import { formatMoney, todayIso } from "../lib/format";

type SupplierOpt = { id: string; name: string };
type Method = { key: string; name: string; enabled: boolean };

const cats = ["frocks", "chudidhars", "modern_dress", "shirts_girls_boys", "pants_girls_boys", "sarwani", "kids_dress", "feeding_bottle", "cycle", "pampers", "bed", "toys", "soap", "powder", "gift_box", "other"] as const;

type Item = { productName: string; category: string; quantity: number; rate: number; discount: number };

export function PurchaseFormPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [suppliers, setSuppliers] = useState<SupplierOpt[]>([]);
  const [methods, setMethods] = useState<Method[]>([]);
  const [supplierId, setSupplierId] = useState(params.get("supplierId") ?? "");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(todayIso());
  const [items, setItems] = useState<Item[]>([{ productName: "", category: "frocks", quantity: 1, rate: 0, discount: 0 }]);
  const [otherCharges, setOtherCharges] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void api<{ suppliers: SupplierOpt[] }>("/api/suppliers").then((d) => setSuppliers(d.suppliers));
    void api<{ paymentMethods: Method[] }>("/api/payment-methods").then((d) =>
      setMethods(d.paymentMethods.filter((m) => m.enabled))
    );
  }, []);

  const calc = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + i.quantity * i.rate, 0);
    const discount = items.reduce((s, i) => s + i.discount, 0);
    const grandTotal = subtotal - discount + Number(otherCharges || 0);
    const paid = Number(paidAmount || 0);
    const outstanding = grandTotal - paid;
    return { subtotal, discount, grandTotal, paid, outstanding };
  }, [items, otherCharges, paidAmount]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!supplierId) return setError(t("purchases.selectSupplier"));
    if (calc.paid > calc.grandTotal + 0.009) return setError(t("purchases.paidExceeds"));
    try {
      await api("/api/purchases", {
        method: "POST",
        body: JSON.stringify({
          supplierId,
          invoiceNumber,
          purchaseDate,
          items: items.map((i) => ({
            ...i,
            quantity: Number(i.quantity),
            rate: Number(i.rate),
            discount: Number(i.discount),
          })),
          otherCharges: Number(otherCharges),
          paidAmount: Number(paidAmount),
          paymentMethod: Number(paidAmount) > 0 ? paymentMethod : "",
          notes,
        }),
      });
      toast.success(t("purchases.created"));
      navigate(`/suppliers/${supplierId}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("errors.savePurchase"));
    }
  };

  return (
    <Card className="mx-auto max-w-5xl">
      <h2 className="mb-4 text-xl font-semibold">{t("purchases.add")}</h2>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>{t("purchases.supplier")}</Label>
            <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
              <option value="">{t("purchases.selectSupplier")}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>{t("purchases.invoice")}</Label>
            <Input value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} required />
          </div>
          <div>
            <Label>{t("purchases.date")}</Label>
            <Input type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} required />
          </div>
        </div>

        <div>
          <div className="mb-2 font-medium">{t("purchases.products")}</div>
          <div className="mb-2 hidden grid-cols-6 gap-2 px-3 text-xs font-medium text-stone-500 sm:grid">
            <span>{t("purchases.productName")}</span>
            <span>{t("purchases.category")}</span>
            <span>{t("purchases.quantity")}</span>
            <span>{t("purchases.costRate")}</span>
            <span>{t("purchases.discount")}</span>
            <span>{t("purchases.itemTotal")}</span>
          </div>
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="grid gap-2 rounded-lg border border-stone-200 p-3 dark:border-stone-800 sm:grid-cols-6">
                <Input
                  placeholder={t("purchases.productName")}
                  value={item.productName}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx].productName = e.target.value;
                    setItems(next);
                  }}
                  required
                />
                <Select
                  value={item.category}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx].category = e.target.value;
                    setItems(next);
                  }}
                >
                  {cats.map((c) => (
                    <option key={c} value={c}>
                      {t(`categories.${c}`)}
                    </option>
                  ))}
                </Select>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder={t("purchases.quantity")}
                  value={item.quantity}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx].quantity = Number(e.target.value);
                    setItems(next);
                  }}
                />
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder={t("purchases.rate")}
                  value={item.rate}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx].rate = Number(e.target.value);
                    setItems(next);
                  }}
                />
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder={t("purchases.discount")}
                  value={item.discount}
                  onChange={(e) => {
                    const next = [...items];
                    next[idx].discount = Number(e.target.value);
                    setItems(next);
                  }}
                />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm">{formatMoney(Math.max(item.quantity * item.rate - item.discount, 0))}</span>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setItems(items.filter((_, i) => i !== idx))}
                    >
                      {t("purchases.removeRow")}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-2"
            onClick={() => setItems([...items, { productName: "", category: "frocks", quantity: 1, rate: 0, discount: 0 }])}
          >
            {t("purchases.addRow")}
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <Label>{t("purchases.otherCharges")}</Label>
            <Input type="number" min={0} step="0.01" value={otherCharges} onChange={(e) => setOtherCharges(Number(e.target.value))} />
          </div>
          <div>
            <Label>{t("purchases.paidAmount")}</Label>
            <Input type="number" min={0} step="0.01" value={paidAmount} onChange={(e) => setPaidAmount(Number(e.target.value))} />
          </div>
          <div>
            <Label>{t("purchases.paymentMethod")}</Label>
            <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              {methods.map((m) => (
                <option key={m.key} value={m.key}>
                  {t(`methods.${m.key}`, { defaultValue: m.name })}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div>
          <Label>{t("purchases.notes")}</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>

        <div className="grid gap-2 rounded-lg bg-stone-50 p-4 text-sm dark:bg-stone-800/50 sm:grid-cols-3">
          <div>
            {t("purchases.subtotal")}: {formatMoney(calc.subtotal)}
          </div>
          <div>
            {t("purchases.discount")}: {formatMoney(calc.discount)}
          </div>
          <div>
            {t("purchases.otherCharges")}: {formatMoney(otherCharges)}
          </div>
          <div>
            {t("purchases.grandTotal")}: {formatMoney(calc.grandTotal)}
          </div>
          <div>
            {t("purchases.paidAmount")}: {formatMoney(calc.paid)}
          </div>
          <div>
            {t("purchases.outstanding")}: {formatMoney(calc.outstanding)}
          </div>
        </div>
        <FieldError>{error}</FieldError>
        <div className="flex gap-2">
          <Button type="submit">{t("common.save")}</Button>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
