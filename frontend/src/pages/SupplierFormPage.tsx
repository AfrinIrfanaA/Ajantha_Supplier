import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError, api } from "../api/client";
import { Button, Card, FieldError, Input, Label, Select, Textarea } from "../components/ui";
import { useToast } from "../context/ToastContext";

const types = ["manufacturer", "wholesaler", "distributor", "retailer", "other"] as const;
const cats = ["frocks", "chudidhars", "modern_dress", "shirts_girls_boys", "pants_girls_boys", "sarwani", "kids_dress", "feeding_bottle", "cycle", "pampers", "bed", "toys", "soap", "powder", "gift_box", "other"] as const;
const methods = ["cash", "bank_transfer", "gpay", "cheque"];

const empty = {
  name: "",
  businessName: "",
  mobile: "",
  city: "",
  address: "",
  notes: "",
  supplierType: "",
  categories: [] as string[],
  preferredPaymentMethod: "cash",
  otherCategory: "",
};

export function SupplierFormPage({
  mode,
  onSaved,
  onCancel,
}: {
  mode: "create" | "edit";
  onSaved?: () => void;
  onCancel?: () => void;
}) {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(mode === "edit");

  useEffect(() => {
    if (mode === "edit" && id) {
      api<{ supplier: typeof empty & { id: string } }>(`/api/suppliers/${id}`)
        .then((d) =>
          setForm({
            name: d.supplier.name,
            businessName: d.supplier.businessName,
            mobile: d.supplier.mobile,
            city: d.supplier.city,
            address: d.supplier.address,
            notes: d.supplier.notes,
            supplierType: d.supplier.supplierType,
            categories: d.supplier.categories,
            preferredPaymentMethod: d.supplier.preferredPaymentMethod || "cash",
            otherCategory: d.supplier.otherCategory || "",
          })
        )
        .finally(() => setLoading(false));
    }
  }, [mode, id]);

  const validate = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = t("suppliers.nameRequired");
    if (!/^[0-9]{10}$/.test(form.mobile.trim())) next.mobile = t("suppliers.mobileInvalid");
    if (!form.supplierType) next.supplierType = t("suppliers.typeRequired");
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      if (mode === "create") {
        const data = await api<{ supplier: { id: string } }>("/api/suppliers", {
          method: "POST",
          body: JSON.stringify(form),
        });
        toast.success(t("suppliers.created"));
        if (onSaved) onSaved();
        else navigate(`/suppliers/${data.supplier.id}`);
      } else {
        await api(`/api/suppliers/${id}`, { method: "PUT", body: JSON.stringify(form) });
        toast.success(t("suppliers.updated"));
        navigate(`/suppliers/${id}`);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("errors.saveSupplier"));
    }
  };

  if (loading) return <p>{t("common.loading")}</p>;

  return (
    <Card className="mx-auto max-w-3xl">
      <h2 className="mb-4 text-xl font-semibold">{mode === "create" ? t("suppliers.add") : t("suppliers.edit")}</h2>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-1">
          <Label>{t("suppliers.name")}</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <FieldError>{errors.name}</FieldError>
        </div>
        <div>
          <Label>{t("suppliers.businessName")}</Label>
          <Input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
        </div>
        <div>
          <Label>{t("suppliers.mobile")}</Label>
          <Input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
          <FieldError>{errors.mobile}</FieldError>
        </div>
        <div>
          <Label>{t("suppliers.city")}</Label>
          <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label>{t("suppliers.address")}</Label>
          <Textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={2} />
        </div>
        <div>
          <Label>{t("suppliers.type")}</Label>
          <Select value={form.supplierType} onChange={(e) => setForm({ ...form, supplierType: e.target.value })}>
            <option value="">—</option>
            {types.map((x) => (
              <option key={x} value={x}>
                {t(`supplierTypes.${x}`)}
              </option>
            ))}
          </Select>
          <FieldError>{errors.supplierType}</FieldError>
        </div>
        <div>
          <Label>{t("suppliers.preferredPayment")}</Label>
          <Select
            value={form.preferredPaymentMethod}
            onChange={(e) => setForm({ ...form, preferredPaymentMethod: e.target.value })}
          >
            {methods.map((m) => (
              <option key={m} value={m}>
                {t(`methods.${m}`)}
              </option>
            ))}
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label>{t("suppliers.productCategories")}</Label>
          <div className="mt-1 flex flex-wrap gap-3">
            {cats.map((c) => (
              <label key={c} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.categories.includes(c)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      categories: e.target.checked ? [...form.categories, c] : form.categories.filter((x) => x !== c),
                    })
                  }
                />
                {t(`categories.${c}`)}
              </label>
            ))}
          </div>
          {form.categories.includes("other") && (
            <div className="mt-3">
              <Label>{t("suppliers.specifyOtherCategory")}</Label>
              <Input
                value={form.otherCategory}
                onChange={(e) => setForm({ ...form, otherCategory: e.target.value })}
                required
              />
            </div>
          )}
        </div>
        <div className="sm:col-span-2">
          <Label>{t("suppliers.notes")}</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
        </div>
        <div className="flex gap-2 sm:col-span-2">
          <Button type="submit">{t("common.save")}</Button>
          <Button type="button" variant="outline" onClick={() => (onCancel ? onCancel() : navigate(-1))}>
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    </Card>
  );
}
