import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError, api, apiDownload } from "../api/client";
import { Button, Card, Dialog, Input, Label, Select } from "../components/ui";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useToast } from "../context/ToastContext";
import { canBackup, canExport, canManageSettings, canManageUsers } from "../lib/permissions";

type Settings = {
  shopName: string;
  city: string;
  mobile: string;
  openingCashBalance: number;
  openingBankBalance: number;
  openingDate: string | null;
};

type AppUser = { id: string; name: string; role: string; status: string };

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const toast = useToast();
  const owner = canManageSettings(user?.role);

  const [settings, setSettings] = useState<Settings | null>(null);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [openingConfirm, setOpeningConfirm] = useState(false);
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "staff" });

  const load = async () => {
    const s = await api<{ settings: Settings }>("/api/settings");
    setSettings({
      ...s.settings,
      openingDate: s.settings.openingDate ? String(s.settings.openingDate).slice(0, 10) : "",
    });
    if (owner) {
      const u = await api<{ users: AppUser[] }>("/api/users");
      setUsers(u.users);
    }
  };

  useEffect(() => {
    void load().catch(() => toast.error(t("errors.generic")));
  }, []);

  const saveShop = async (confirmOpening = false) => {
    if (!settings) return;
    try {
      await api("/api/settings", {
        method: "PUT",
        body: JSON.stringify({
          ...settings,
          openingCashBalance: Number(settings.openingCashBalance),
          openingBankBalance: Number(settings.openingBankBalance),
          openingDate: settings.openingDate || null,
          confirmOpeningBalanceChange: confirmOpening,
        }),
      });
      toast.success(t("settings.saved"));
      setOpeningConfirm(false);
    } catch (err) {
      if (err instanceof ApiError && err.code === "CONFIRM_OPENING_BALANCE") {
        setOpeningConfirm(true);
        return;
      }
      toast.error(err instanceof ApiError ? err.message : t("errors.generic"));
    }
  };

  const downloadBackup = async (format: "json" | "xlsx" | "pdf") => {
    const stamp = new Date().toISOString().slice(0, 10);
    const extension = format === "xlsx" ? "xlsx" : format;
    try {
      await apiDownload(
        `/api/backup?format=${format}`,
        `supplier-manager-backup-${stamp}.${extension}`
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("errors.generic"));
    }
  };

  if (!settings) return <p>{t("common.loading")}</p>;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card>
        <h2 className="mb-1 text-lg font-semibold">{t("settings.appearance")}</h2>
        <p className="mb-3 text-sm text-stone-500">{t("settings.appearanceHint")}</p>
        <Select value={theme} onChange={(e) => setTheme(e.target.value as "light" | "dark")}>
          <option value="light">{t("common.light")}</option>
          <option value="dark">{t("common.dark")}</option>
        </Select>
      </Card>

      <Card>
        <h2 className="mb-1 text-lg font-semibold">{t("settings.language")}</h2>
        <p className="mb-3 text-sm text-stone-500">{t("settings.languageHint")}</p>
        <Select
          value={i18n.language.startsWith("ta") ? "ta" : "en"}
          onChange={(e) => {
            void i18n.changeLanguage(e.target.value);
            localStorage.setItem("language", e.target.value);
          }}
        >
          <option value="en">{t("common.english")}</option>
          <option value="ta">{t("common.tamil")}</option>
        </Select>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">{t("settings.shop")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>{t("settings.shopName")}</Label>
            <Input disabled={!owner} value={settings.shopName} onChange={(e) => setSettings({ ...settings, shopName: e.target.value })} />
          </div>
          <div>
            <Label>{t("common.city")}</Label>
            <Input disabled={!owner} value={settings.city} onChange={(e) => setSettings({ ...settings, city: e.target.value })} />
          </div>
          <div>
            <Label>{t("common.mobile")}</Label>
            <Input disabled={!owner} value={settings.mobile} onChange={(e) => setSettings({ ...settings, mobile: e.target.value })} />
          </div>
        </div>
        {owner && (
          <Button className="mt-4" onClick={() => void saveShop(false)}>
            {t("common.save")}
          </Button>
        )}
      </Card>

      {owner && (
        <Card>
          <h2 className="mb-3 text-lg font-semibold">{t("settings.opening")}</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label>{t("settings.openingCash")}</Label>
              <Input
                type="number"
                value={settings.openingCashBalance}
                onChange={(e) => setSettings({ ...settings, openingCashBalance: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>{t("settings.openingBank")}</Label>
              <Input
                type="number"
                value={settings.openingBankBalance}
                onChange={(e) => setSettings({ ...settings, openingBankBalance: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>{t("settings.openingDate")}</Label>
              <Input
                type="date"
                value={settings.openingDate ?? ""}
                onChange={(e) => setSettings({ ...settings, openingDate: e.target.value })}
              />
            </div>
          </div>
          <Button className="mt-4" onClick={() => void saveShop(false)}>
            {t("common.save")}
          </Button>
        </Card>
      )}

      {canManageUsers(user?.role) && (
        <Card>
          <h2 className="mb-3 text-lg font-semibold">{t("settings.users")}</h2>
          <form
            className="mb-4 grid gap-2 sm:grid-cols-5"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api("/api/users", { method: "POST", body: JSON.stringify(userForm) });
                toast.success(t("settings.userCreated"));
                setUserForm({ name: "", email: "", password: "", role: "staff" });
                void load();
              } catch (err) {
                toast.error(err instanceof ApiError ? err.message : t("errors.generic"));
              }
            }}
          >
            <Input placeholder={t("common.name")} value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} required />
            <Input placeholder={t("common.email")} type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} required />
            <Input placeholder={t("auth.password")} type="password" value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} required />
            <Select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}>
              <option value="owner">{t("roles.owner")}</option>
              <option value="accountant">{t("roles.accountant")}</option>
              <option value="staff">{t("roles.staff")}</option>
            </Select>
            <Button type="submit">{t("settings.addUser")}</Button>
          </form>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b dark:border-stone-800">
                  <th className="py-2">{t("common.name")}</th>
                  <th className="py-2">{t("common.role")}</th>
                  <th className="py-2">{t("common.status")}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b dark:border-stone-800">
                    <td className="py-2">{u.name}</td>
                    <td className="py-2">{t(`roles.${u.role}`)}</td>
                    <td className="py-2">{u.status === "active" ? t("common.active") : t("common.disabled")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {(canBackup(user?.role) || canExport(user?.role)) && (
        <Card>
          <h2 className="mb-3 text-lg font-semibold">{t("settings.data")}</h2>
          {canBackup(user?.role) && (
            <p className="mb-3 text-sm text-stone-500">{t("settings.backupHint")}</p>
          )}
          <div className="flex flex-wrap gap-3">
            {canBackup(user?.role) && (
              <>
                <Button onClick={() => void downloadBackup("json")}>
                  {t("settings.downloadBackup")}
                </Button>
                <Button variant="outline" onClick={() => void downloadBackup("xlsx")}>
                  {t("settings.downloadExcelBackup")}
                </Button>
                <Button variant="outline" onClick={() => void downloadBackup("pdf")}>
                  {t("settings.downloadPdfBackup")}
                </Button>
              </>
            )}
            {canExport(user?.role) && (
              <Button
                variant="outline"
                onClick={async () => {
                  const stamp = new Date().toISOString().slice(0, 10);
                  await apiDownload("/api/export", `ajantha-export-${stamp}.zip`);
                }}
              >
                {t("settings.downloadExport")}
              </Button>
            )}
          </div>
        </Card>
      )}

      {!owner && !canExport(user?.role) && (
        <p className="text-sm text-stone-500">{t("settings.noPermission")}</p>
      )}

      <Dialog open={openingConfirm} title={t("settings.opening")} onClose={() => setOpeningConfirm(false)}>
        <p className="mb-4 text-sm">{t("settings.openingWarning")}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpeningConfirm(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={() => void saveShop(true)}>{t("common.confirm")}</Button>
        </div>
      </Dialog>

    </div>
  );
}
