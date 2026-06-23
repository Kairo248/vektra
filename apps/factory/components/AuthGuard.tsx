"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { userId, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && userId == null) {
      router.replace("/login");
    }
  }, [ready, userId, router]);

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-sm text-zinc-500">Loading…</p>
      </div>
    );
  }

  if (userId == null) return null;

  return <>{children}</>;
}
