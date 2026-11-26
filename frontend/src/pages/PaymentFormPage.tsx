import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ApiError, api } from "../api/client";
import { Button, Card, FieldError, Input, Label, Select } from "../components/ui";
import { useToast } from "../context/ToastContext";
import { formatMoney, todayIso } from "../lib/format";

type SupplierOpt = { id: string; name: string; outstanding: number };
type Method = { key: string; name: string; enabled: boolean };

export function PaymentFormPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [suppliers, setSuppliers] = useState<SupplierOpt[]>([]);
  const [methods, setMethods] = useState<Method[]>([]);
  const [supplierId, setSupplierId] = useState(params.get("supplierId") ?? "");
  const [paymentDate, setPaymentDate] = useState(todayIso());
  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [error, setError] = useState("");

  useEffect(() => {
    void api<{ suppliers: SupplierOpt[] }>("/api/suppliers").then((d) => setSuppliers(d.suppliers));
    void api<{ paymentMethods: Method[] }>("/api/payment-methods").then((d) =>
      setMethods(d.paymentMethods.filter((m) => m.enabled))
    );
  }, []);

  const selected = suppliers.find((s) => s.id === supplierId);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!supplierId) return setError(t("purchases.selectSupplier"));
    if (selected && amount - selected.outstanding > 0.009) return setError(t("payments.exceeds"));
    try {
      await api("/api/supplier-payments", {
        method: "POST",
        body: JSON.stringify({
          supplierId,
          paymentDate,
          amount: Number(amount),
          paymentMethod,
        }),
      });
      toast.success(t("payments.created"));
      navigate(`/suppliers/${supplierId}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("errors.savePayment"));
    }
  };

  return (
    <Card className="max-w-xl mx-auto">
      <h2 className="mb-4 text-xl font-semibold">{t("payments.add")}</h2>
      <form onSubmit={submit} className="space-y-4">
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
        {selected && (
          <div className="space-y-1 text-sm">
            <p className="text-stone-500">
              {t("suppliers.outstandingBalance")}: {formatMoney(selected.outstanding)}
            </p>
            <p className="font-medium">
              {t("payments.remainingBalance", { defaultValue: "Remaining Balance" })}:{" "}
              {formatMoney(Math.max(selected.outstanding - Number(amount || 0), 0))}
            </p>
          </div>
        )}
        <div>
          <Label>{t("payments.date")}</Label>
          <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required />
        </div>
        <div>
          <Label>{t("payments.amount")}</Label>
          <Input type="number" min={0.01} step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} required />
        </div>
        <div>
          <Label>{t("payments.method")}</Label>
          <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {methods.map((m) => (
              <option key={m.key} value={m.key}>
                {t(`methods.${m.key}`, { defaultValue: m.name })}
              </option>
            ))}
          </Select>
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
