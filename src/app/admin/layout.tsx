import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/admin";
import { AdminShell } from "@/components/admin/AdminShell";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  robots: { index: false, follow: false },
};

// Server-side gate for every /admin page (defence in depth on top of the middleware).
// Each admin server action and API route still checks authorization independently.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAdmin();
  if (!auth.ok) {
    redirect(auth.status === 401 ? "/auth/login?redirect=%2Fadmin" : "/?denied=admin");
  }
  return <AdminShell role={auth.role}>{children}</AdminShell>;
}
