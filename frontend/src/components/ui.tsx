import { cn } from "../lib/cn";

export function Button({
  className,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
}) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-brand-600 text-white hover:bg-brand-700",
        variant === "secondary" && "bg-stone-200 text-stone-900 hover:bg-stone-300 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700",
        variant === "ghost" && "hover:bg-stone-100 dark:hover:bg-stone-800",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        variant === "outline" &&
          "border border-stone-300 bg-white hover:bg-stone-50 dark:border-stone-700 dark:bg-stone-900 dark:hover:bg-stone-800",
        className
      )}
      {...props}
    />
  );
}

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2 dark:border-stone-700 dark:bg-stone-900",
        className
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2 dark:border-stone-700 dark:bg-stone-900",
        className
      )}
      {...props}
    />
  );
}

export function Select({ className, ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm outline-none ring-brand-500 focus:ring-2 dark:border-stone-700 dark:bg-stone-900",
        className
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1 block text-sm font-medium", className)} {...props} />;
}

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-stone-200 bg-white p-4 shadow-sm dark:border-stone-800 dark:bg-stone-900",
        className
      )}
      {...props}
    />
  );
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-1 text-xs text-red-600 dark:text-red-400">{children}</p>;
}

export function Badge({
  status,
  children,
}: {
  status?: "paid" | "partial" | "unpaid" | "active" | "disabled";
  children: React.ReactNode;
}) {
  const map: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    partial: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
    unpaid: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
    active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
    disabled: "bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
  };
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", status ? map[status] : "bg-stone-100 dark:bg-stone-800")}>
      {children}
    </span>
  );
}

export function Dialog({
  open,
  title,
  children,
  onClose,
  className,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className={cn(
          "max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl bg-white p-5 shadow-xl dark:bg-stone-900",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-800 dark:hover:text-stone-200">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
