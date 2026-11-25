import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { Badge, Button, Card } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { formatDate, formatMoney } from "../lib/format";
import { canWriteFinance, canWriteSuppliers } from "../lib/permissions";

type Dashboard = {
  summary: { totalSuppliers: number; totalPurchases: number; totalPaid: number; totalOutstanding: number };
  paymentStatus: { paid: number; partial: number; unpaid: number };
  finance: { cash: number; bank: number; gpay: number; cheque: number };
  recentPurchases: Array<{
    id: string;
    supplier: string;
    invoiceNumber: string;
    date: string;
    totalAmount: number;
    paidAmount: number;
    outstanding: number;
    paymentStatus: "paid" | "partial" | "unpaid";
  }>;
  recentPayments: Array<{ id: string; supplier: string; amount: number; paymentMethod: string; date: string }>;
  outstandingSuppliers: Array<{
    id: string;
    name: string;
    totalPurchases: number;
    totalPaid: number;
    outstanding: number;
  }>;
};

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setData(await api<Dashboard>("/api/dashboard"));
    } catch {
      setError(t("errors.generic"));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <p>{t("common.loading")}</p>;

  const cards = [
    { label: t("dashboard.totalSuppliers"), value: data.summary.totalSuppliers },
    { label: t("dashboard.totalPurchases"), value: formatMoney(data.summary.totalPurchases) },
    { label: t("dashboard.totalPaid"), value: formatMoney(data.summary.totalPaid) },
    { label: t("dashboard.totalOutstanding"), value: formatMoney(data.summary.totalOutstanding) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <div className="text-sm text-stone-500">{c.label}</div>
            <div className="mt-1 text-2xl font-semibold">{c.value}</div>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {canWriteSuppliers(user?.role) && (
          <Button onClick={() => navigate("/suppliers/new")}>{t("dashboard.addSupplier")}</Button>
        )}
        {canWriteFinance(user?.role) && (
          <>
            <Button variant="outline" onClick={() => navigate("/purchases/new")}>
              {t("dashboard.addPurchase")}
            </Button>
            <Button variant="outline" onClick={() => navigate("/payments/new")}>
              {t("dashboard.recordPayment")}
            </Button>
          </>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">{t("dashboard.paymentStatus")}</h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <Badge status="paid">{t("status.paid")}</Badge>
              <div className="mt-2 text-xl font-semibold">{data.paymentStatus.paid}</div>
            </div>
            <div>
              <Badge status="partial">{t("status.partial")}</Badge>
              <div className="mt-2 text-xl font-semibold">{data.paymentStatus.partial}</div>
            </div>
            <div>
              <Badge status="unpaid">{t("status.unpaid")}</Badge>
              <div className="mt-2 text-xl font-semibold">{data.paymentStatus.unpaid}</div>
            </div>
          </div>
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">{t("dashboard.quickActions")}</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              {t("dashboard.cash")}: <b>{formatMoney(data.finance.cash)}</b>
            </div>
            <div>
              {t("dashboard.bank")}: <b>{formatMoney(data.finance.bank)}</b>
            </div>
            <div>
              {t("dashboard.gpay")}: <b>{formatMoney(data.finance.gpay)}</b>
            </div>
            <div>
              {t("dashboard.cheque")}: <b>{formatMoney(data.finance.cheque)}</b>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 font-semibold">{t("dashboard.recentPurchases")}</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b dark:border-stone-800">
                <th className="py-2 pr-3">{t("purchases.supplier")}</th>
                <th className="py-2 pr-3">{t("purchases.invoice")}</th>
                <th className="py-2 pr-3">{t("common.date")}</th>
                <th className="py-2 pr-3">{t("purchases.grandTotal")}</th>
                <th className="py-2 pr-3">{t("purchases.paidAmount")}</th>
                <th className="py-2 pr-3">{t("purchases.outstanding")}</th>
                <th className="py-2">{t("common.status")}</th>
              </tr>
            </thead>
            <tbody>
              {data.recentPurchases.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-4 text-stone-500">
                    {t("dashboard.noPurchases")}
                  </td>
                </tr>
              )}
              {data.recentPurchases.map((p) => (
                <tr key={p.id} className="border-b dark:border-stone-800">
                  <td className="py-2 pr-3">{p.supplier}</td>
                  <td className="py-2 pr-3">{p.invoiceNumber}</td>
                  <td className="py-2 pr-3">{formatDate(p.date)}</td>
                  <td className="py-2 pr-3">{formatMoney(p.totalAmount)}</td>
                  <td className="py-2 pr-3">{formatMoney(p.paidAmount)}</td>
                  <td className="py-2 pr-3">{formatMoney(p.outstanding)}</td>
                  <td className="py-2">
                    <Badge status={p.paymentStatus}>{t(`status.${p.paymentStatus}`)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-3 font-semibold">{t("dashboard.recentPayments")}</h2>
          {data.recentPayments.length === 0 ? (
            <p className="text-sm text-stone-500">{t("dashboard.noPayments")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b dark:border-stone-800">
                    <th className="py-2">{t("purchases.supplier")}</th>
                    <th className="py-2">{t("common.amount")}</th>
                    <th className="py-2">{t("payments.method")}</th>
                    <th className="py-2">{t("common.date")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentPayments.map((p) => (
                    <tr key={p.id} className="border-b dark:border-stone-800">
                      <td className="py-2">{p.supplier}</td>
                      <td className="py-2">{formatMoney(p.amount)}</td>
                      <td className="py-2">{t(`methods.${p.paymentMethod}`, { defaultValue: p.paymentMethod })}</td>
                      <td className="py-2">{formatDate(p.date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card>
          <h2 className="mb-3 font-semibold">{t("dashboard.outstandingSuppliers")}</h2>
          {data.outstandingSuppliers.length === 0 ? (
            <p className="text-sm text-stone-500">{t("dashboard.noOutstanding")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b dark:border-stone-800">
                    <th className="py-2">{t("suppliers.name")}</th>
                    <th className="py-2">{t("suppliers.totalPurchases")}</th>
                    <th className="py-2">{t("suppliers.totalPaid")}</th>
                    <th className="py-2">{t("suppliers.outstanding")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.outstandingSuppliers.map((s) => (
                    <tr
                      key={s.id}
                      className="cursor-pointer border-b dark:border-stone-800"
                      onClick={() => navigate(`/suppliers/${s.id}`)}
                    >
                      <td className="py-2">{s.name}</td>
                      <td className="py-2">{formatMoney(s.totalPurchases)}</td>
                      <td className="py-2">{formatMoney(s.totalPaid)}</td>
                      <td className="py-2">{formatMoney(s.outstanding)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
