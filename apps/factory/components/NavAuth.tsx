"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearSession, getStoredUserId } from "@/lib/session";

export function NavAuth() {
  const router = useRouter();
  const [userId, setUserId] = useState<number | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUserId(getStoredUserId());
    setReady(true);
  }, []);

  function logout() {
    clearSession();
    setUserId(null);
    router.push("/");
    router.refresh();
  }

  if (!ready) {
    return <span className="text-sm text-zinc-400">…</span>;
  }

  if (userId != null) {
    return (
      <button
        type="button"
        onClick={logout}
        className="rounded-md px-2 py-1 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
      >
        Log out
      </button>
    );
  }

  return (
    <Link
      href="/login"
      className="rounded-md px-2 py-1 text-sm font-medium text-emerald-800 hover:bg-emerald-50"
    >
      Log in
    </Link>
  );
}
