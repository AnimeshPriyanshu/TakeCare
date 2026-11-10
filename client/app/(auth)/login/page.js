"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useAuth } from "@/hooks/AuthContext";
import { useToast } from "@/hooks/ToastContext";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";

const DEMO_ACCOUNTS = [
  { label: "Customer", email: "aarav@takecare.demo", hint: "Aarav · medicines & requests" },
  { label: "Pharmacist", email: "raghav@takecare.demo", hint: "CarePlus Pharmacy" },
];

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && user) {
      router.replace(user.role === "CUSTOMER" ? "/customer" : "/pharmacist");
    }
  }, [user, loading, router]);

  function fillDemo(account) {
    setEmail(account.email);
    setPassword("Password123!");
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const loggedIn = await login(email, password);
      toast.success("Welcome back", `Signed in as ${loggedIn.name}.`);
      router.replace(loggedIn.role === "CUSTOMER" ? "/customer" : "/pharmacist");
    } catch (err) {
      setError(err.message || "Unable to sign in");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
          Welcome back
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
          Sign in to TakeCare
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Access your medicines, pharmacy or replenishment requests.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700"
          >
            {error}
          </div>
        ) : null}

        <Field label="Email address" required>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className="pl-10"
            />
          </div>
        </Field>

        <Field label="Password" required>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              className="pl-10 pr-11"
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

        <Button
          type="submit"
          size="lg"
          className="w-full"
          loading={submitting}
          icon={submitting ? undefined : ArrowRight}
        >
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Demo quick fill
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => fillDemo(account)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left transition hover:border-brand-300 hover:bg-brand-50/50"
            >
              <p className="text-sm font-semibold text-slate-800">{account.label}</p>
              <p className="text-[11px] text-slate-500">{account.hint}</p>
            </button>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-slate-500">
          Password for all demo accounts:{" "}
          <code className="rounded bg-white px-1.5 py-0.5 font-mono">Password123!</code>
        </p>
      </div>

      <p className="mt-6 text-center text-sm text-slate-500">
        New to TakeCare?{" "}
        <Link href="/register" className="font-semibold text-brand-700 hover:text-brand-800">
          Create an account
        </Link>
      </p>
    </div>
  );
}
