import { Check, X } from "lucide-react";
import { requestProgress } from "@/lib/format";

const STEPS = [
  { label: "Requested", detail: "Sent to pharmacy" },
  { label: "Response", detail: "Accepted or proposed" },
  { label: "Fulfilment", detail: "Marked ready" },
  { label: "Confirmed", detail: "Inventory updated" },
];

const TERMINAL = ["REJECTED", "CUSTOMER_DECLINED", "CANCELLED"];

export default function RequestTimeline({ status }) {
  const progress = requestProgress(status);
  const isTerminal = TERMINAL.includes(status);

  return (
    <div>
      <ol className="grid grid-cols-4 gap-2">
        {STEPS.map((step, index) => {
          const done = index < progress;
          const current = index === progress - 1;
          const failed = isTerminal && index === 1;
          return (
            <li key={step.label} className="relative">
              {index < STEPS.length - 1 ? (
                <span
                  className={`absolute left-1/2 top-4 h-0.5 w-full ${index < progress - 1 ? "bg-brand-500" : "bg-slate-200"}`}
                />
              ) : null}
              <div className="relative flex flex-col items-center text-center">
                <span
                  className={`z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ring-4 ring-white ${
                    failed
                      ? "bg-rose-500 text-white"
                      : done
                        ? "bg-brand-600 text-white"
                        : "bg-slate-100 text-slate-400"
                  } ${current && !failed ? "shadow-sm shadow-brand-600/30" : ""}`}
                >
                  {failed ? (
                    <X className="h-4 w-4" />
                  ) : done ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </span>
                <p
                  className={`mt-2 text-[11px] font-semibold sm:text-xs ${done && !failed ? "text-slate-900" : "text-slate-400"}`}
                >
                  {step.label}
                </p>
                <p className="mt-0.5 hidden text-[10px] text-slate-400 sm:block">
                  {step.detail}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
