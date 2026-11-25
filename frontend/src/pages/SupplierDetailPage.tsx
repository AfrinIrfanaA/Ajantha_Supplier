import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { ApiError, api } from "../api/client";
import { Badge, Button, Card, Dialog, Input, Select } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";
import { formatDate, formatMoney } from "../lib/format";
import { canWriteFinance, canWriteSuppliers } from "../lib/permissions";

type Supplier = {
  id: string;
  name: string;
  businessName: string;
  mobile: string;
  city: string;
  address: string;
  notes: string;
  supplierType: string;
  categories: string[];
  totalPurchases: number;
  totalPaid: number;
  outstanding: number;
  paymentStatus: "paid" | "partial" | "unpaid";
};

type Purchase = {
  id: string;
  invoiceNumber: string;
  purchaseDate: string;
  grandTotal: number;
  paidAmount: number;
  outstandingAmount: number;
  paymentMethod: string;
  status: "paid" | "partial" | "unpaid";
  items: Array<{ productName: string; quantity: number; rate: number; discount: number; total: number; category: string }>;
};

type Payment = {
  id: string;
  paymentDate: string;
  amount: number;
  paymentMethod: string;
  referenceNumber: string;
  notes: string;
};

type Ledger = {
  id: string;
  date: string;
  transactionType: "purchase" | "payment";
  reference: string;
  debit: number;
  credit: number;
  balance: number;
};

export function SupplierDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"purchases" | "payments" | "ledger">("purchases");
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [ledger, setLedger] = useState<Ledger[]>([]);
  const [viewPurchase, setViewPurchase] = useState<Purchase | null>(null);
  const [ledgerType, setLedgerType] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deletePurchaseId, setDeletePurchaseId] = useState<string | null>(null);
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);
  const toast = useToast();

  const load = async () => {
    const s = await api<{ supplier: Supplier }>(`/api/suppliers/${id}`);
    setSupplier(s.supplier);
    const p = await api<{ purchases: Purchase[] }>(`/api/purchases?supplierId=${id}`);
    setPurchases(p.purchases);
    const pay = await api<{ payments: Payment[] }>(`/api/supplier-payments?supplierId=${id}`);
    setPayments(pay.payments);
    const params = new URLSearchParams();
    if (ledgerType) params.set("type", ledgerType);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    const l = await api<{ ledger: Ledger[] }>(`/api/suppliers/${id}/ledger?${params.toString()}`);
    setLedger(l.ledger);
  };

  useEffect(() => {
    void load();
  }, [id]);

  if (!supplier) return <p>{t("common.loading")}</p>;

  const tabs = [
    ["purchases", t("suppliers.purchases")],
    ["payments", t("suppliers.payments")],
    ["ledger", t("suppliers.ledger")],
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold">{supplier.name}</h2>
          <p className="text-stone-500">{supplier.businessName}</p>
          <p className="text-sm">
            {supplier.mobile} · {supplier.city} · {t(`supplierTypes.${supplier.supplierType}`)}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {supplier.categories.map((category) => (
              <span
                key={category}
                className="rounded-full bg-violet-50 px-2.5 py-1 text-xs text-violet-700 dark:bg-violet-950 dark:text-violet-200"
              >
                {t(`categories.${category}`)}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          {canWriteFinance(user?.role) && (
            <Button
              className="bg-amber-500 text-stone-950 hover:bg-amber-600"
              onClick={() => navigate(`/payments/new?supplierId=${id}`)}
            >
              {t("payments.add")}
            </Button>
          )}
          {canWriteSuppliers(user?.role) && (
            <Button variant="outline" onClick={() => navigate(`/suppliers/${id}/edit`)}>
              {t("common.edit")}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Card>
          <div className="text-sm text-stone-500">{t("suppliers.totalPurchases")}</div>
          <div className="text-xl font-semibold">{formatMoney(supplier.totalPurchases)}</div>
        </Card>
        <Card>
          <div className="text-sm text-stone-500">{t("suppliers.totalPaid")}</div>
          <div className="text-xl font-semibold">{formatMoney(supplier.totalPaid)}</div>
        </Card>
        <Card>
          <div className="text-sm text-stone-500">{t("suppliers.outstandingBalance")}</div>
          <div className="text-xl font-semibold">{formatMoney(supplier.outstanding)}</div>
        </Card>
        <Card>
          <div className="text-sm text-stone-500">{t("suppliers.paymentStatus")}</div>
          <Badge status={supplier.paymentStatus}>{t(`status.${supplier.paymentStatus}`)}</Badge>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-stone-200 dark:border-stone-800">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            className={`px-3 py-2 text-sm ${tab === key ? "border-b-2 border-brand-600 font-medium" : "text-stone-500"}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "purchases" && (
        <Card>
          <div className="mb-3 flex justify-end">
            {canWriteFinance(user?.role) && (
              <Button onClick={() => navigate(`/purchases/new?supplierId=${id}`)}>{t("purchases.add")}</Button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b dark:border-stone-800">
                  <th className="py-2">{t("purchases.invoice")}</th>
                  <th className="py-2">{t("common.date")}</th>
                  <th className="py-2">{t("purchases.grandTotal")}</th>
                  <th className="py-2">{t("purchases.paidAmount")}</th>
                  <th className="py-2">{t("purchases.outstanding")}</th>
                  <th className="py-2">{t("purchases.paymentMethod")}</th>
                  <th className="py-2">{t("common.status")}</th>
                  <th className="py-2">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {purchases.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-4 text-stone-500">
                      {t("dashboard.noPurchases")}
                    </td>
                  </tr>
                )}
                {purchases.map((p) => (
                  <tr key={p.id} className="border-b dark:border-stone-800">
                    <td className="py-2">{p.invoiceNumber}</td>
                    <td className="py-2">{formatDate(p.purchaseDate)}</td>
                    <td className="py-2">{formatMoney(p.grandTotal)}</td>
                    <td className="py-2">{formatMoney(p.paidAmount)}</td>
                    <td className="py-2">{formatMoney(p.outstandingAmount)}</td>
                    <td className="py-2">{p.paymentMethod ? t(`methods.${p.paymentMethod}`, { defaultValue: p.paymentMethod }) : "—"}</td>
                    <td className="py-2">
                      <Badge status={p.status}>{t(`status.${p.status}`)}</Badge>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        <Button variant="ghost" onClick={() => setViewPurchase(p)}>
                          {t("purchases.view")}
                        </Button>
                        {canWriteFinance(user?.role) && (
                          <Button variant="ghost" onClick={() => setDeletePurchaseId(p.id)}>
                            {t("common.delete")}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "payments" && (
        <Card>
          <div className="mb-3 flex justify-end">
            {canWriteFinance(user?.role) && (
              <Button onClick={() => navigate(`/payments/new?supplierId=${id}`)}>{t("payments.add")}</Button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b dark:border-stone-800">
                  <th className="py-2">{t("common.date")}</th>
                  <th className="py-2">{t("common.amount")}</th>
                  <th className="py-2">{t("payments.method")}</th>
                  <th className="py-2">{t("payments.reference")}</th>
                  <th className="py-2">{t("common.notes")}</th>
                </tr>
              </thead>
              <tbody>
                {payments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 text-stone-500">
                      {t("dashboard.noPayments")}
                    </td>
                  </tr>
                )}
                {payments.map((p) => (
                  <tr key={p.id} className="border-b dark:border-stone-800">
                    <td className="py-2">{formatDate(p.paymentDate)}</td>
                    <td className="py-2">{formatMoney(p.amount)}</td>
                    <td className="py-2">{t(`methods.${p.paymentMethod}`, { defaultValue: p.paymentMethod })}</td>
                    <td className="py-2">{p.referenceNumber}</td>
                    <td className="py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span>{p.notes}</span>
                        {canWriteFinance(user?.role) && (
                          <Button variant="ghost" onClick={() => setDeletePaymentId(p.id)}>
                            {t("common.delete")}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "ledger" && (
        <Card>
          <div className="mb-3 flex flex-wrap gap-2">
            <Select value={ledgerType} onChange={(e) => setLedgerType(e.target.value)}>
              <option value="">{t("common.all")}</option>
              <option value="purchase">{t("ledger.purchase")}</option>
              <option value="payment">{t("ledger.payment")}</option>
            </Select>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            <Button variant="outline" onClick={() => void load()}>
              {t("common.filter")}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b dark:border-stone-800">
                  <th className="py-2">{t("common.date")}</th>
                  <th className="py-2">{t("common.type")}</th>
                  <th className="py-2">{t("common.reference")}</th>
                  <th className="py-2">{t("ledger.debit")}</th>
                  <th className="py-2">{t("ledger.credit")}</th>
                  <th className="py-2">{t("ledger.balance")}</th>
                </tr>
              </thead>
              <tbody>
                {ledger.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 text-stone-500">
                      {t("ledger.empty")}
                    </td>
                  </tr>
                )}
                {ledger.map((e) => (
                  <tr key={e.id} className="border-b dark:border-stone-800">
                    <td className="py-2">{formatDate(e.date)}</td>
                    <td className="py-2">{t(`ledger.${e.transactionType}`)}</td>
                    <td className="py-2">{e.reference}</td>
                    <td className="py-2">{e.debit ? formatMoney(e.debit) : "—"}</td>
                    <td className="py-2">{e.credit ? formatMoney(e.credit) : "—"}</td>
                    <td className="py-2">{formatMoney(e.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Dialog open={!!viewPurchase} title={t("purchases.view")} onClose={() => setViewPurchase(null)}>
        {viewPurchase && (
          <div className="space-y-3 text-sm">
            <div>
              {t("purchases.invoice")}: {viewPurchase.invoiceNumber}
            </div>
            <div>
              {t("common.date")}: {formatDate(viewPurchase.purchaseDate)}
            </div>
            <table className="w-full text-left">
              <thead>
                <tr>
                  <th>{t("purchases.productName")}</th>
                  <th>{t("purchases.quantity")}</th>
                  <th>{t("purchases.rate")}</th>
                  <th>{t("purchases.itemTotal")}</th>
                </tr>
              </thead>
              <tbody>
                {viewPurchase.items.map((item, i) => (
                  <tr key={i}>
                    <td>{item.productName}</td>
                    <td>{item.quantity}</td>
                    <td>{formatMoney(item.rate)}</td>
                    <td>{formatMoney(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div>
              {t("purchases.grandTotal")}: {formatMoney(viewPurchase.grandTotal)}
            </div>
          </div>
        )}
      </Dialog>

      <Dialog open={!!deletePurchaseId} title={t("common.delete")} onClose={() => setDeletePurchaseId(null)}>
        <p className="mb-4 text-sm">{t("purchases.confirmDelete", { defaultValue: "Delete this purchase and recalculate its ledger and financial records?" })}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeletePurchaseId(null)}>{t("common.cancel")}</Button>
          <Button variant="danger" onClick={async () => {
            try {
              await api(`/api/purchases/${deletePurchaseId}`, { method: "DELETE" });
              setDeletePurchaseId(null);
              await load();
              toast.success(t("common.success"));
            } catch (err) {
              toast.error(err instanceof ApiError ? err.message : t("errors.generic"));
            }
          }}>{t("common.delete")}</Button>
        </div>
      </Dialog>

      <Dialog open={!!deletePaymentId} title={t("common.delete")} onClose={() => setDeletePaymentId(null)}>
        <p className="mb-4 text-sm">{t("payments.confirmDelete", { defaultValue: "Delete this payment and recalculate outstanding balances?" })}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeletePaymentId(null)}>{t("common.cancel")}</Button>
          <Button variant="danger" onClick={async () => {
            try {
              await api(`/api/supplier-payments/${deletePaymentId}`, { method: "DELETE" });
              setDeletePaymentId(null);
              await load();
              toast.success(t("common.success"));
            } catch (err) {
              toast.error(err instanceof ApiError ? err.message : t("errors.generic"));
            }
          }}>{t("common.delete")}</Button>
        </div>
      </Dialog>
    </div>
  );
}
