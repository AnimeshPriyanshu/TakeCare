"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Store,
  UserRound,
} from "lucide-react";
import { useAuth } from "@/hooks/AuthContext";
import { useToast } from "@/hooks/ToastContext";
import Button from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";

const EMPTY_PHARMACY = {
  name: "",
  address: "",
  city: "",
  pincode: "",
  phone: "",
  licenseNumber: "",
  description: "",
};

export default function RegisterPage() {
  const { register, user, loading } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [role, setRole] = useState("CUSTOMER");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [pharmacy, setPharmacy] = useState(EMPTY_PHARMACY);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("role") === "pharmacist") setRole("PHARMACIST");
  }, []);

  useEffect(() => {
    if (!loading && user) {
      router.replace(user.role === "CUSTOMER" ? "/customer" : "/pharmacist");
    }
  }, [user, loading, router]);

  function updatePharmacy(key, value) {
    setPharmacy((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const payload = { name, email, password, role };
      if (role === "PHARMACIST") payload.pharmacy = pharmacy;
      const created = await register(payload);
      toast.success(
        "Account created",
        created.role === "CUSTOMER"
          ? "Start by adding your medicines."
          : "Your pharmacy profile is ready.",
      );
      router.replace(created.role === "CUSTOMER" ? "/customer" : "/pharmacist");
    } catch (err) {
      const details = Array.isArray(err.details)
        ? err.details.map((item) => item.message).join(" ")
        : "";
      setError(details || err.message || "Unable to create your account");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
          Get started
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Create your account
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Choose how you will use TakeCare. You can only hold one role per account.
        </p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-2">
        {[
          {
            value: "CUSTOMER",
            title: "Customer",
            copy: "Track family medicines",
            icon: UserRound,
          },
          {
            value: "PHARMACIST",
            title: "Pharmacist",
            copy: "Manage a pharmacy",
            icon: Store,
          },
        ].map((option) => {
          const Icon = option.icon;
          const active = role === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setRole(option.value)}
              className={`rounded-xl border p-3.5 text-left transition ${
                active
                  ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/20"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${active ? "text-brand-600" : "text-slate-400"}`}
              />
              <p className="mt-2 text-sm font-semibold text-slate-900">{option.title}</p>
              <p className="text-[11px] text-slate-500">{option.copy}</p>
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
          >
            {error}
          </div>
        ) : null}

        <Field label="Full name" required>
          <Input
            required
            minLength={2}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Aarav Sharma"
            autoComplete="name"
          />
        </Field>

        <Field label="Email address" required>
          <Input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </Field>

        <Field
          label="Password"
          required
          hint="At least 8 characters. Use a unique password for the demo."
        >
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              required
              minLength={8}
              maxLength={72}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              className="pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </Field>

        {role === "PHARMACIST" ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
            <div className="mb-3">
              <p className="text-sm font-semibold text-slate-900">Pharmacy profile</p>
              <p className="text-xs text-slate-500">
                Required for pharmacist accounts. Demo registrations are auto-approved so
                they appear in the customer directory.
              </p>
            </div>
            <div className="space-y-3.5">
              <Field label="Pharmacy name" required>
                <Input
                  required={role === "PHARMACIST"}
                  value={pharmacy.name}
                  onChange={(event) => updatePharmacy("name", event.target.value)}
                  placeholder="e.g. CarePlus Pharmacy"
                />
              </Field>
              <Field label="Street address" required>
                <Input
                  required={role === "PHARMACIST"}
                  value={pharmacy.address}
                  onChange={(event) => updatePharmacy("address", event.target.value)}
                  placeholder="Building, street, area"
                />
              </Field>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="City" required>
                  <Input
                    required={role === "PHARMACIST"}
                    value={pharmacy.city}
                    onChange={(event) => updatePharmacy("city", event.target.value)}
                    placeholder="Bengaluru"
                  />
                </Field>
                <Field label="Pincode" required>
                  <Input
                    required={role === "PHARMACIST"}
                    value={pharmacy.pincode}
                    onChange={(event) => updatePharmacy("pincode", event.target.value)}
                    placeholder="560095"
                    inputMode="numeric"
                  />
                </Field>
              </div>
              <div className="grid gap-3.5 sm:grid-cols-2">
                <Field label="Phone" required>
                  <Input
                    required={role === "PHARMACIST"}
                    value={pharmacy.phone}
                    onChange={(event) => updatePharmacy("phone", event.target.value)}
                    placeholder="+91 98450 11223"
                  />
                </Field>
                <Field label="License number" required>
                  <Input
                    required={role === "PHARMACIST"}
                    value={pharmacy.licenseNumber}
                    onChange={(event) =>
                      updatePharmacy("licenseNumber", event.target.value)
                    }
                    placeholder="KA-PH-2024-0192"
                  />
                </Field>
              </div>
              <Field label="Short description" hint="Optional. Shown in the directory.">
                <Textarea
                  rows={2}
                  value={pharmacy.description}
                  onChange={(event) => updatePharmacy("description", event.target.value)}
                  placeholder="What should customers know about your pharmacy?"
                />
              </Field>
            </div>
          </div>
        ) : null}

        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          {submitting ? "Creating account…" : "Create account"}
          {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-brand-700 hover:text-brand-800">
          Sign in
        </Link>
      </p>
    </div>
  );
}
