"use client";

import { useAuth } from "@/contexts/AuthContext";

export function HeaderAuth() {
  const { user, ready, logout } = useAuth();

  if (!ready) return null;
  if (!user) return null;

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-zinc-600">
        {user.name} {user.surname}
      </span>
      <button
        type="button"
        onClick={logout}
        className="rounded-md px-2.5 py-1 font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
      >
        Log out
      </button>
    </div>
  );
}
