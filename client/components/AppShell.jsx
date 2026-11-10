"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Boxes,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Pill,
  Sparkles,
  Store,
  Users,
  X,
} from "lucide-react";
import Logo from "@/components/ui/Logo";
import NotificationsMenu from "@/components/NotificationsMenu";
import { useAuth } from "@/hooks/AuthContext";
import { useToast } from "@/hooks/ToastContext";

const NAVIGATION = {
  CUSTOMER: [
    { href: "/customer", label: "Overview", icon: LayoutDashboard },
    { href: "/customer/medicines", label: "Medicines", icon: Pill },
    { href: "/customer/pharmacies", label: "Pharmacies", icon: MapPin },
    { href: "/customer/requests", label: "Requests", icon: ClipboardList },
    { href: "/customer/assistant", label: "Assistant", icon: Sparkles },
    { href: "/customer/family", label: "Family", icon: Users },
  ],
  PHARMACIST: [
    { href: "/pharmacist", label: "Overview", icon: LayoutDashboard },
    { href: "/pharmacist/pharmacy", label: "Pharmacy profile", icon: Store },
    { href: "/pharmacist/catalog", label: "Catalog", icon: Boxes },
    { href: "/pharmacist/requests", label: "Requests", icon: ClipboardList },
  ],
};

function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function NavLinks({ items, pathname, onNavigate }) {
  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              active
                ? "bg-brand-50 text-brand-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Icon
              className={`h-[18px] w-[18px] ${active ? "text-brand-600" : "text-slate-400 group-hover:text-slate-600"}`}
            />
            {item.label}
            {active ? (
              <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand-500" />
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarContent({ user, items, pathname, onNavigate, onLogout, loggingOut }) {
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-6 pt-6">
        <Logo href="/" />
      </div>

      <div className="flex-1 overflow-y-auto px-3">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          {user.role === "CUSTOMER" ? "My care" : "My pharmacy"}
        </p>
        <NavLinks items={items} pathname={pathname} onNavigate={onNavigate} />
      </div>

      <div className="border-t border-slate-100 p-4">
        <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
            {initials(user.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-800">{user.name}</p>
            <p className="truncate text-[11px] text-slate-500">
              {user.role === "CUSTOMER" ? "Customer" : user.pharmacy?.name || "Pharmacist"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:opacity-60"
        >
          <LogOut className="h-4 w-4" />
          {loggingOut ? "Signing out…" : "Sign out"}
        </button>
        <p className="mt-2 px-3 text-[10px] font-medium uppercase tracking-[0.14em] text-slate-300">
          Hackathon demo
        </p>
      </div>
    </div>
  );
}

export default function AppShell({ children }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!user) return null;

  const items = NAVIGATION[user.role] ?? [];
  const current =
    [...items]
      .sort((a, b) => b.href.length - a.href.length)
      .find((item) => pathname === item.href || pathname.startsWith(`${item.href}/`)) ??
    items[0];

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logout();
      toast.success("Signed out", "See you next time.");
      router.replace("/login");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-200 bg-white lg:block">
        <SidebarContent
          user={user}
          items={items}
          pathname={pathname}
          onNavigate={() => setMobileOpen(false)}
          onLogout={handleLogout}
          loggingOut={loggingOut}
        />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-72 max-w-[85vw] border-r border-slate-200 bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-5 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <SidebarContent
              user={user}
              items={items}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
              onLogout={handleLogout}
              loggingOut={loggingOut}
            />
          </div>
        </div>
      ) : null}

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/80 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                  {user.role === "CUSTOMER" ? "Customer workspace" : "Pharmacist workspace"}
                </p>
                <h1 className="truncate text-base font-semibold text-slate-900">
                  {current?.label ?? "TakeCare"}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <NotificationsMenu />
              <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 sm:flex">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                  {initials(user.name)}
                </span>
                <span className="max-w-[10rem] truncate text-sm font-medium text-slate-700">
                  {user.name}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
          {children}
        </main>
      </div>
    </div>
  );
}
