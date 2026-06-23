import type { AccountState } from "@/types/vektra";

const styles: Record<AccountState, string> = {
  PENDING: "bg-amber-100 text-amber-900 ring-amber-200",
  ACTIVE: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  SUSPENDED: "bg-red-100 text-red-900 ring-red-200",
};

export function AccountStateBadge({ state }: { state: AccountState }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${styles[state]}`}
    >
      {state}
    </span>
  );
}
