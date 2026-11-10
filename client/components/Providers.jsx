"use client";

import { AuthProvider } from "@/hooks/AuthContext";
import { ToastProvider } from "@/hooks/ToastContext";

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <ToastProvider>{children}</ToastProvider>
    </AuthProvider>
  );
}
