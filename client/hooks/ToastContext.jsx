"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import Button from "@/components/ui/Button";

const ToastContext = createContext(null);

let counter = 0;

const TONE = {
  success: {
    icon: CheckCircle2,
    classes: "border-emerald-200 bg-white",
    iconClasses: "text-emerald-600",
  },
  error: {
    icon: AlertTriangle,
    classes: "border-rose-200 bg-white",
    iconClasses: "text-rose-600",
  },
  info: {
    icon: Info,
    classes: "border-sky-200 bg-white",
    iconClasses: "text-sky-600",
  },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    ({ type = "success", title, message }) => {
      const id = ++counter;
      setToasts((current) => [...current, { id, type, title, message }]);
      setTimeout(() => dismiss(id), 5000);
      return id;
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      toast,
      success: (title, message) => toast({ type: "success", title, message }),
      error: (title, message) => toast({ type: "error", title, message }),
      info: (title, message) => toast({ type: "info", title, message }),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0">
        {toasts.map((item) => {
          const tone = TONE[item.type] ?? TONE.info;
          const Icon = tone.icon;
          return (
            <div
              key={item.id}
              className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-4 shadow-lg shadow-slate-900/5 ${tone.classes}`}
              role="status"
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${tone.iconClasses}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                {item.message ? (
                  <p className="mt-0.5 text-sm text-slate-600">{item.message}</p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => dismiss(item.id)}
                aria-label="Dismiss notification"
                icon={X}
              />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider");
  return context;
}
