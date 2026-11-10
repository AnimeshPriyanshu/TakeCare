"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import Button from "@/components/ui/Button";

export default function ErrorState({ error, onRetry, title = "Something went wrong" }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-100 bg-rose-50/50 px-6 py-14 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-rose-600 ring-1 ring-inset ring-rose-200">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-slate-600">
        {error?.message || "Please try again."}
      </p>
      {onRetry ? (
        <Button variant="secondary" className="mt-5" onClick={onRetry} icon={RefreshCw}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
