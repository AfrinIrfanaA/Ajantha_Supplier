import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError, api } from "../api/client";
import { Button, Card, FieldError, Input, Label } from "../components/ui";
import { useToast } from "../context/ToastContext";

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
    if (!form.businessName.trim()) next.businessName = t("suppliers.businessNameRequired");
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      if (mode === "create") {
        const payload = {
          ...form,
          name: form.businessName.trim(),
          mobile: "",
          address: "",
          notes: "",
          supplierType: "other",
          categories: [],
          preferredPaymentMethod: "cash",
          otherCategory: "",
        };
        const data = await api<{ supplier: { id: string } }>("/api/suppliers", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast.success(t("suppliers.created"));
        if (onSaved) onSaved();
        else navigate(`/suppliers/${data.supplier.id}`);
      } else {
        await api(`/api/suppliers/${id}`, {
          method: "PUT",
          body: JSON.stringify({
            ...form,
            name: form.businessName.trim(),
            mobile: form.mobile || "",
            supplierType: form.supplierType || "other",
          }),
        });
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
        <div>
          <Label>{t("suppliers.businessName")}</Label>
          <Input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
          <FieldError>{errors.businessName}</FieldError>
        </div>
        <div>
          <Label>{t("suppliers.city")}</Label>
          <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
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
