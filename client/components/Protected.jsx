"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/AuthContext";
import { PageLoading } from "@/components/ui/Spinner";

export default function Protected({ role, children }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (role && user.role !== role) {
      router.replace(user.role === "CUSTOMER" ? "/customer" : "/pharmacist");
    }
  }, [user, loading, role, router]);

  if (loading) return <PageLoading />;
  if (!user) return <PageLoading />;
  if (role && user.role !== role) return <PageLoading />;

  return children;
}
