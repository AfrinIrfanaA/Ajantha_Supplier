import { Languages, LogOut, Menu, Moon, Sun, UserRound, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { cn } from "../lib/cn";
import { Button, Dialog, Select } from "./ui";

const links = [
  { to: "/", key: "nav.dashboard" },
  { to: "/suppliers", key: "nav.suppliers" },
  { to: "/settings", key: "nav.settings" },
];

export function Layout() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const location = useLocation();

  const title =
    location.pathname.startsWith("/settings")
      ? t("settings.title")
      : location.pathname.startsWith("/suppliers")
        ? t("suppliers.title")
        : t("dashboard.title");

  const changeLang = (lng: string) => {
    void i18n.changeLanguage(lng);
    localStorage.setItem("language", lng);
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <img
            src="/app-icon-192.png"
            alt=""
            className="h-10 w-10 rounded-full bg-white object-contain"
          />
          <div>
            <div className="text-xs uppercase tracking-widest text-violet-200/80">Shop</div>
            <div className="text-lg font-semibold text-white">{t("appName")}</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === "/"}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              cn(
                "block rounded-lg px-3 py-2 text-sm",
                isActive ? "bg-white/15 text-white" : "text-violet-50/80 hover:bg-white/10 hover:text-white"
              )
            }
          >
            {t(l.key)}
          </NavLink>
        ))}
      </nav>
      <div className="border-t border-white/10 p-4">
        <div className="mb-3 flex items-center gap-2 text-sm text-white">
          <UserRound size={16} />
          <div>
            <div className="font-medium">{user?.name}</div>
            <div className="text-xs text-violet-100/70">{t(`roles.${user?.role}`)}</div>
          </div>
        </div>
        <Button variant="secondary" className="w-full bg-white/10 text-white hover:bg-white/20" onClick={() => setLogoutOpen(true)}>
          <LogOut size={16} /> {t("nav.logout")}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 bg-brand-900 lg:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="relative h-full w-72 bg-brand-900">{sidebar}</aside>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-stone-200 bg-white/90 px-4 py-3 backdrop-blur dark:border-stone-800 dark:bg-stone-900/90">
          <div className="flex items-center gap-3">
            <button className="rounded-lg p-2 lg:hidden" onClick={() => setOpen(true)} aria-label="menu">
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1 sm:flex">
              <Languages size={16} className="text-stone-500" />
              <Select value={i18n.language.startsWith("ta") ? "ta" : "en"} onChange={(e) => changeLang(e.target.value)} className="w-[120px] py-1">
                <option value="en">{t("common.english")}</option>
                <option value="ta">{t("common.tamil")}</option>
              </Select>
            </div>
            <Select
              value={theme}
              onChange={(e) => setTheme(e.target.value as "light" | "dark")}
              className="w-[120px] py-1"
            >
              <option value="light">{t("common.light")}</option>
              <option value="dark">{t("common.dark")}</option>
            </Select>
            <div className="hidden items-center gap-2 rounded-full border border-stone-200 px-3 py-1 text-sm dark:border-stone-700 sm:flex">
              {theme === "dark" ? <Moon size={14} /> : <Sun size={14} />}
              {user?.name}
            </div>
          </div>
        </header>
        <main className="p-4 sm:p-6">
          <div className="mb-4 flex gap-2 sm:hidden">
            <Select value={i18n.language.startsWith("ta") ? "ta" : "en"} onChange={(e) => changeLang(e.target.value)}>
              <option value="en">{t("common.english")}</option>
              <option value="ta">{t("common.tamil")}</option>
            </Select>
          </div>
          <Outlet />
        </main>
      </div>
      <Dialog open={logoutOpen} title={t("nav.logout")} onClose={() => setLogoutOpen(false)}>
        <p className="mb-4 text-sm">{t("confirm.logout")}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setLogoutOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              await logout();
              setLogoutOpen(false);
            }}
          >
            {t("nav.logout")}
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
