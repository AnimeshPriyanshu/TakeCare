"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  MapPin,
  Phone,
  Search,
  ShieldCheck,
  Store,
} from "lucide-react";
import { useApi } from "@/hooks/useApi";
import PageHeader from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import { SkeletonRows } from "@/components/ui/Spinner";

export default function PharmaciesPage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 350);
    return () => clearTimeout(timer);
  }, [search]);

  const { data, loading, error, refresh } = useApi(
    `/pharmacies?search=${encodeURIComponent(debounced)}`,
  );

  const pharmacies = data?.pharmacies ?? [];

  return (
    <div>
      <PageHeader
        eyebrow="Registered directory"
        title="Pharmacies"
        description="Browse active, approved pharmacies, check the availability they have published and start a replenishment request."
      />

      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by pharmacy name…"
            className="pl-10"
            aria-label="Search pharmacies by name"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="h-4 w-4 text-brand-600" />
          Only active, approved pharmacies are listed
        </div>
      </div>

      {error ? (
        <ErrorState error={error} onRetry={refresh} />
      ) : loading && !data ? (
        <Card>
          <SkeletonRows rows={4} />
        </Card>
      ) : pharmacies.length === 0 ? (
        <Card>
          <EmptyState
            icon={Store}
            title="No pharmacies found"
            description={
              debounced
                ? `No registered pharmacy matches “${debounced}”. Try a different name.`
                : "There are no active, approved pharmacies in the directory yet."
            }
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pharmacies.map((pharmacy) => (
            <Card
              key={pharmacy.id}
              className="flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-600/10">
                  <Store className="h-5 w-5" />
                </span>
                <Badge tone="emerald">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Verified
                </Badge>
              </div>

              <h2 className="mt-3 text-base font-semibold text-slate-900">
                {pharmacy.name}
              </h2>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                <MapPin className="h-3.5 w-3.5" />
                {pharmacy.city}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                <Phone className="h-3.5 w-3.5" />
                {pharmacy.phone}
              </p>
              {pharmacy.description ? (
                <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-slate-500">
                  {pharmacy.description}
                </p>
              ) : null}

              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                    Catalog
                  </p>
                  <p className="text-sm font-semibold text-slate-800">
                    {pharmacy.catalogCount} items
                  </p>
                </div>
                <div className="rounded-xl bg-brand-50/70 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-600">
                    Available
                  </p>
                  <p className="text-sm font-semibold text-brand-800">
                    {pharmacy.availableCount} items
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2">
                <Link
                  href={`/customer/pharmacies/${pharmacy.id}`}
                  className={`${buttonClasses({ size: "sm", className: "flex-1" })}`}
                >
                  View catalog
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="mt-5 text-center text-xs text-slate-400">
        Availability is supplied by each pharmacist and can change. Submitting a request
        does not reserve stock or place an order.
      </p>
    </div>
  );
}
