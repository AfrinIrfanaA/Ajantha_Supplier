import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ApiError, api } from "../api/client";
import { Button, Card, FieldError, Input, Label, Select } from "../components/ui";
import { useToast } from "../context/ToastContext";
import { todayIso } from "../lib/format";

type SupplierOpt = { id: string; name: string };

export function PurchaseFormPage() {
  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [suppliers, setSuppliers] = useState<SupplierOpt[]>([]);
  const [supplierId, setSupplierId] = useState(params.get("supplierId") ?? "");
  const [purchaseDate, setPurchaseDate] = useState(todayIso());
  const [paidAmount, setPaidAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    void api<{ suppliers: SupplierOpt[] }>("/api/suppliers").then((d) => setSuppliers(d.suppliers));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!supplierId) return setError(t("purchases.selectSupplier"));
    if (paidAmount > totalAmount + 0.009) return setError(t("purchases.paidExceeds"));

    try {
      await api("/api/purchases", {
        method: "POST",
        body: JSON.stringify({
          supplierId,
          purchaseDate,
          totalAmount: Number(totalAmount),
          paidAmount: Number(paidAmount),
          paymentMethod: paidAmount > 0 ? "cash" : "",
        }),
      });
      toast.success(t("purchases.created"));
      navigate(`/suppliers/${supplierId}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("errors.savePurchase"));
    }
  };

  return (
    <Card className="mx-auto max-w-3xl">
      <h2 className="mb-4 text-xl font-semibold">{t("purchases.add")}</h2>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>{t("purchases.supplier")}</Label>
            <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required>
              <option value="">{t("purchases.selectSupplier")}</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label>{t("purchases.date")}</Label>
            <Input
              type="date"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>{t("purchases.paidAmount")}</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={paidAmount}
              onChange={(e) => setPaidAmount(Number(e.target.value))}
              required
            />
          </div>
          <div>
            <Label>{t("purchases.totalAmount")}</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={totalAmount}
              onChange={(e) => setTotalAmount(Number(e.target.value))}
              required
            />
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
