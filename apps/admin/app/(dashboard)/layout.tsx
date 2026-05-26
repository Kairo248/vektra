"use client";

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AuthGuard } from "@/components/AuthGuard";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex flex-col gap-8 md:flex-row md:gap-10">
        <AdminSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </AuthGuard>
  );
}
