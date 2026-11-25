import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { Button, FieldError, Input, Label } from "../components/ui";
import { useAuth } from "../context/AuthContext";

export function LoginPage() {
  const { t, i18n } = useTranslation();
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!email) next.email = t("auth.requiredEmail");
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = t("auth.invalidEmail");
    if (!password) next.password = t("auth.requiredPassword");
    setErrors(next);
    setFormError("");
    if (Object.keys(next).length) return;
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      if (err instanceof ApiError && err.code === "ACCOUNT_DISABLED") setFormError(t("auth.disabled"));
      else if (err instanceof ApiError) setFormError(t("auth.invalid"));
      else setFormError(t("errors.generic"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-stone-100 p-4 dark:bg-stone-950">
      <form onSubmit={submit} className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-sm dark:border-stone-800 dark:bg-stone-900">
        <div className="mb-6 flex flex-col items-center text-center">
          <img
            src="/brand-wordmark.png"
            alt="Ajantha Textiles"
            className="mb-3 h-auto w-44"
          />
          <img
            src="/app-icon-192.png"
            alt=""
            className="mb-3 h-12 w-12 rounded-full bg-white object-contain"
          />
          <h1 className="text-2xl font-semibold">{t("appName")}</h1>
          <p className="mt-1 text-sm text-stone-500">{t("auth.welcome")}</p>
        </div>
        <Label>{t("auth.email")}</Label>
        <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="email" />
        <FieldError>{errors.email}</FieldError>
        <div className="mt-4">
          <Label>{t("auth.password")}</Label>
          <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" autoComplete="current-password" />
          <FieldError>{errors.password}</FieldError>
        </div>
        {formError && <p className="mt-3 text-sm text-red-600">{formError}</p>}
        <Button className="mt-6 w-full" disabled={loading}>
          {loading ? t("common.loading") : t("auth.login")}
        </Button>
        <div className="mt-4 flex justify-end">
          <select
            className="rounded border border-stone-300 bg-transparent px-2 py-1 text-sm dark:border-stone-700"
            value={i18n.language.startsWith("ta") ? "ta" : "en"}
            onChange={(e) => {
              void i18n.changeLanguage(e.target.value);
              localStorage.setItem("language", e.target.value);
            }}
          >
            <option value="en">{t("common.english")}</option>
            <option value="ta">{t("common.tamil")}</option>
          </select>
        </div>
      </form>
    </div>
  );
}
