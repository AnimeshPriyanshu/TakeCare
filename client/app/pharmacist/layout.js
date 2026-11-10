import AppShell from "@/components/AppShell";
import Protected from "@/components/Protected";

export default function PharmacistLayout({ children }) {
  return (
    <Protected role="PHARMACIST">
      <AppShell>{children}</AppShell>
    </Protected>
  );
}
