import { createContext, useCallback, useContext, useState } from "react";
import { cn } from "../lib/cn";

type Toast = { id: number; message: string; type: "success" | "error" };

const ToastContext = createContext<{
  success: (m: string) => void;
  error: (m: string) => void;
}>({ success: () => undefined, error: () => undefined });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((message: string, type: Toast["type"]) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ success: (m) => push(m, "success"), error: (m) => push(m, "error") }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[80] flex w-[min(92vw,360px)] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "rounded-lg border px-4 py-3 text-sm shadow-lg",
              t.type === "success"
                ? "border-emerald-200 bg-white text-emerald-800 dark:border-emerald-800 dark:bg-stone-900 dark:text-emerald-200"
                : "border-red-200 bg-white text-red-800 dark:border-red-800 dark:bg-stone-900 dark:text-red-200"
            )}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
