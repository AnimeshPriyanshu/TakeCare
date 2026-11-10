import AppShell from "@/components/AppShell";
import Protected from "@/components/Protected";

export default function CustomerLayout({ children }) {
  return (
    <Protected role="CUSTOMER">
      <AppShell>{children}</AppShell>
    </Protected>
  );
}
