"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { api } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { useApi } from "@/hooks/useApi";
import { useAuth } from "@/hooks/AuthContext";
import { useToast } from "@/hooks/ToastContext";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";

export default function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const router = useRouter();
  const { user } = useAuth();
  const toast = useToast();
  const { data, loading, refresh } = useApi("/notifications");
  const [working, setWorking] = useState(false);

  useEffect(() => {
    const onClick = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => refresh({ silent: true }), 30000);
    return () => clearInterval(interval);
  }, [refresh]);

  const notifications = data?.notifications ?? [];
  const unread = data?.unread ?? 0;

  async function markAll() {
    setWorking(true);
    try {
      await api.post("/notifications/read-all");
      await refresh({ silent: true });
    } catch (error) {
      toast.error("Could not update notifications", error.message);
    } finally {
      setWorking(false);
    }
  }

  async function openNotification(notification) {
    if (!notification.isRead) {
      try {
        await api.post(`/notifications/${notification.id}/read`);
        refresh({ silent: true });
      } catch {
        // non-blocking
      }
    }
    setOpen(false);
    if (user?.role === "CUSTOMER" && notification.replenishmentRequestId) {
      router.push(`/customer/requests/${notification.replenishmentRequestId}`);
    } else if (user?.role === "PHARMACIST") {
      router.push("/pharmacist/requests");
    } else if (user?.role === "CUSTOMER") {
      router.push("/customer/requests");
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
      >
        <Bell className="h-5 w-5" />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-40 mt-2 w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/10">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
              {unread > 0 ? (
                <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                  {unread} new
                </span>
              ) : null}
            </div>
            {unread > 0 ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={markAll}
                loading={working}
                icon={CheckCheck}
              >
                Mark all
              </Button>
            ) : null}
          </div>

          <div className="max-h-[26rem] overflow-y-auto">
            {loading && !data ? (
              <div className="flex items-center justify-center py-10">
                <Spinner />
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell className="mx-auto h-8 w-8 text-slate-300" />
                <p className="mt-2 text-sm font-medium text-slate-600">
                  You are all caught up
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Updates about stock and requests will appear here.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      type="button"
                      onClick={() => openNotification(notification)}
                      className={`block w-full px-4 py-3 text-left transition hover:bg-slate-50 ${notification.isRead ? "" : "bg-brand-50/40"}`}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.isRead ? "bg-slate-200" : "bg-brand-500"}`}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-800">
                            {notification.title}
                          </p>
                          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                            {notification.message}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            {timeAgo(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
