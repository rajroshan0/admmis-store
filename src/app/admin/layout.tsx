import type { Metadata } from "next";
import AdminNav from "@/components/AdminNav";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin(); // non-admins get a 404, logged-out visitors go to /login
  return (
    <div className="container-page py-8">
      <h1 className="mb-4 text-3xl font-semibold">Store admin</h1>
      <AdminNav />
      <div className="pt-6">{children}</div>
    </div>
  );
}
