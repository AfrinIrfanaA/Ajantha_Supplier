import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ApiError, api } from "../api/client";
import { Badge, Button, Card, Dialog, Input, Select } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatMoney } from "../lib/format";
import { canWriteSuppliers } from "../lib/permissions";
import { SupplierFormPage } from "./SupplierFormPage";

type Supplier = {
  id: string;
  name: string;
  businessName: string;
  mobile: string;
  city: string;
  supplierType: string;
  totalPurchases: number;
  totalPaid: number;
  outstanding: number;
  paymentStatus: "paid" | "partial" | "unpaid";
};

const types = ["manufacturer", "wholesaler", "distributor", "retailer", "other"];
const cats = ["frocks", "chudidhars", "modern_dress", "shirts_girls_boys", "pants_girls_boys", "sarwani", "kids_dress", "feeding_bottle", "cycle", "pampers", "bed", "toys", "soap", "powder", "gift_box", "other"];

export function SuppliersPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Supplier[]>([]);
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState({
    datePreset: "",
    supplierType: "",
    category: "",
    paymentStatus: "",
    dateFrom: "",
    dateTo: "",
    minPurchase: "",
    maxPurchase: "",
    minOutstanding: "",
    maxOutstanding: "",
  });
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    Object.entries(filters).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    const data = await api<{ suppliers: Supplier[] }>(`/api/suppliers?${params.toString()}`);
    setRows(data.suppliers);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 300);
    return () => window.clearTimeout(timer);
  }, [q, filters]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">{t("suppliers.title")}</h2>
        {canWriteSuppliers(user?.role) && <Button onClick={() => setAddOpen(true)}>{t("suppliers.add")}</Button>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <div className="text-sm text-stone-500">{t("dashboard.totalSuppliers")}</div>
          <div className="mt-1 text-2xl font-semibold">{rows.length}</div>
        </Card>
        <Card>
          <div className="text-sm text-stone-500">{t("suppliers.totalPurchases")}</div>
          <div className="mt-1 text-2xl font-semibold">{formatMoney(rows.reduce((sum, row) => sum + row.totalPurchases, 0))}</div>
        </Card>
        <Card>
          <div className="text-sm text-stone-500">{t("suppliers.totalPaid")}</div>
          <div className="mt-1 text-2xl font-semibold">{formatMoney(rows.reduce((sum, row) => sum + row.totalPaid, 0))}</div>
        </Card>
        <Card>
          <div className="text-sm text-stone-500">{t("suppliers.outstandingBalance")}</div>
          <div className="mt-1 text-2xl font-semibold">{formatMoney(rows.reduce((sum, row) => sum + row.outstanding, 0))}</div>
        </Card>
      </div>
      <Card className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder={t("suppliers.searchPlaceholder")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void load()}
          />
          <Button onClick={() => void load()}>{t("common.search")}</Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Select value={filters.supplierType} onChange={(e) => setFilters({ ...filters, supplierType: e.target.value })}>
            <option value="">{t("filters.supplierType")}</option>
            {types.map((x) => (
              <option key={x} value={x}>
                {t(`supplierTypes.${x}`)}
              </option>
            ))}
          </Select>
          <Select value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
            <option value="">{t("filters.productCategory")}</option>
            {cats.map((x) => (
              <option key={x} value={x}>
                {t(`categories.${x}`)}
              </option>
            ))}
          </Select>
          <Select value={filters.paymentStatus} onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}>
            <option value="">{t("filters.paymentStatus")}</option>
            <option value="paid">{t("status.paid")}</option>
            <option value="partial">{t("status.partial")}</option>
            <option value="unpaid">{t("status.unpaid")}</option>
          </Select>
          <Select value={filters.datePreset} onChange={(e) => setFilters({ ...filters, datePreset: e.target.value })}>
            <option value="">Date Range</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="year">This Year</option>
            <option value="financialYear">Financial Year</option>
          </Select>
          <div className="flex gap-2">
            <Input type="date" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
            <Input type="date" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
          </div>
          <Input placeholder={`${t("filters.purchaseAmount")} ${t("filters.min")}`} value={filters.minPurchase} onChange={(e) => setFilters({ ...filters, minPurchase: e.target.value })} />
          <Input placeholder={`${t("filters.purchaseAmount")} ${t("filters.max")}`} value={filters.maxPurchase} onChange={(e) => setFilters({ ...filters, maxPurchase: e.target.value })} />
          <Input placeholder={`${t("filters.outstanding")} ${t("filters.min")}`} value={filters.minOutstanding} onChange={(e) => setFilters({ ...filters, minOutstanding: e.target.value })} />
          <Input placeholder={`${t("filters.outstanding")} ${t("filters.max")}`} value={filters.maxOutstanding} onChange={(e) => setFilters({ ...filters, maxOutstanding: e.target.value })} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void load()}>
            {t("common.filter")}
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setQ("");
              setFilters({
                datePreset: "",
                supplierType: "",
                category: "",
                paymentStatus: "",
                dateFrom: "",
                dateTo: "",
                minPurchase: "",
                maxPurchase: "",
                minOutstanding: "",
                maxOutstanding: "",
              });
              setTimeout(() => void load(), 0);
            }}
          >
            {t("common.clear")}
          </Button>
        </div>
      </Card>

      <div className="hidden overflow-x-auto lg:block">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b dark:border-stone-800">
              <th className="py-2">{t("suppliers.name")}</th>
              <th className="py-2">{t("suppliers.mobile")}</th>
              <th className="py-2">{t("suppliers.city")}</th>
              <th className="py-2">{t("suppliers.totalPurchases")}</th>
              <th className="py-2">{t("suppliers.totalPaid")}</th>
              <th className="py-2">{t("suppliers.outstanding")}</th>
              <th className="py-2">{t("suppliers.paymentStatus")}</th>
              <th className="py-2">{t("common.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={8} className="py-6">
                  {t("common.loading")}
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-stone-500">
                  {t("suppliers.noSuppliers")}
                </td>
              </tr>
            )}
            {rows.map((s) => (
              <tr key={s.id} className="border-b dark:border-stone-800">
                <td className="py-2">{s.name}</td>
                <td className="py-2">{s.mobile}</td>
                <td className="py-2">{s.city}</td>
                <td className="py-2">{formatMoney(s.totalPurchases)}</td>
                <td className="py-2">{formatMoney(s.totalPaid)}</td>
                <td className="py-2">{formatMoney(s.outstanding)}</td>
                <td className="py-2">
                  <Badge status={s.paymentStatus}>{t(`status.${s.paymentStatus}`)}</Badge>
                </td>
                <td className="py-2">
                  <div className="flex gap-1">
                    <Button variant="ghost" onClick={() => navigate(`/suppliers/${s.id}`)}>
                      {t("common.view")}
                    </Button>
                    {canWriteSuppliers(user?.role) && (
                      <>
                        <Button variant="ghost" onClick={() => navigate(`/suppliers/${s.id}/edit`)}>
                          {t("common.edit")}
                        </Button>
                        <Button variant="ghost" onClick={() => setDeleteId(s.id)}>
                          {t("common.delete")}
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 lg:hidden">
        {rows.map((s) => (
          <Card key={s.id}>
            <div className="flex items-start justify-between">
              <div>
                <div className="font-semibold">{s.name}</div>
                <div className="text-sm text-stone-500">{s.businessName}</div>
                <div className="text-sm">{s.mobile}</div>
              </div>
              <Badge status={s.paymentStatus}>{t(`status.${s.paymentStatus}`)}</Badge>
            </div>
            <div className="mt-2 text-sm">
              {t("suppliers.outstanding")}: {formatMoney(s.outstanding)}
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" onClick={() => navigate(`/suppliers/${s.id}`)}>
                {t("common.view")}
              </Button>
              {canWriteSuppliers(user?.role) && (
                <>
                  <Button variant="outline" onClick={() => navigate(`/suppliers/${s.id}/edit`)}>
                    {t("common.edit")}
                  </Button>
                  <Button variant="danger" onClick={() => setDeleteId(s.id)}>
                    {t("common.delete")}
                  </Button>
                </>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Dialog
        open={addOpen}
        title={t("suppliers.add")}
        onClose={() => setAddOpen(false)}
        className="max-w-3xl"
      >
        <SupplierFormPage
          mode="create"
          onSaved={() => {
            setAddOpen(false);
            void load();
          }}
          onCancel={() => setAddOpen(false)}
        />
      </Dialog>

      <Dialog open={!!deleteId} title={t("common.delete")} onClose={() => setDeleteId(null)}>
        <p className="mb-4 text-sm">{t("suppliers.confirmDelete")}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteId(null)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              try {
                await api(`/api/suppliers/${deleteId}`, { method: "DELETE" });
                toast.success(t("suppliers.deleted"));
                setDeleteId(null);
                void load();
              } catch (err) {
                toast.error(err instanceof ApiError ? err.message : t("errors.generic"));
              }
            }}
          >
            {t("common.delete")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
