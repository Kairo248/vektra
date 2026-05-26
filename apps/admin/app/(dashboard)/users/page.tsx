"use client";

import { useCallback, useEffect, useState } from "react";
import {
  adminActivateAccount,
  adminListUsers,
  adminSuspendAccount,
} from "@/services/api";
import type { AdminUserListItem } from "@/types/vektra";
import { AccountStateBadge } from "@/components/admin/AccountStateBadge";
import { Button } from "@/components/ui/Button";
import { Table, Th, Td } from "@/components/ui/Table";
import { StatusBanner } from "@/components/StatusBanner";

export default function AdminUsersPage() {
  const [rows, setRows] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busyAccountId, setBusyAccountId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await adminListUsers());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function activate(accountId: number) {
    setBusyAccountId(accountId);
    setFeedback(null);
    try {
      await adminActivateAccount(accountId);
      setFeedback("Account activated.");
      await load();
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "Activate failed");
    } finally {
      setBusyAccountId(null);
    }
  }

  async function suspend(accountId: number) {
    setBusyAccountId(accountId);
    setFeedback(null);
    try {
      await adminSuspendAccount(accountId);
      setFeedback("Account suspended.");
      await load();
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "Suspend failed");
    } finally {
      setBusyAccountId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Users</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Approve pending signups or suspend accounts.
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={() => load()} disabled={loading}>
          Refresh
        </Button>
      </div>

      {feedback && (
        <StatusBanner variant={feedback.includes("failed") ? "error" : "success"}>
          {feedback}
        </StatusBanner>
      )}
      {error && <StatusBanner variant="error">{error}</StatusBanner>}

      {loading ? (
        <p className="text-sm text-zinc-600">Loading users…</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Email</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <Td colSpan={4} className="py-8 text-center text-zinc-500">
                  No users found.
                </Td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr
                  key={r.userId}
                  className={r.accountState === "PENDING" ? "bg-amber-50/60" : undefined}
                >
                  <Td className="font-medium">
                    {r.name} {r.surname}
                    <span className="mt-0.5 block text-xs font-normal text-zinc-500">
                      user #{r.userId} · account #{r.accountId}
                    </span>
                  </Td>
                  <Td>{r.email}</Td>
                  <Td>
                    <AccountStateBadge state={r.accountState} />
                  </Td>
                  <Td className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        variant="primary"
                        disabled={
                          busyAccountId === r.accountId ||
                          r.accountState !== "PENDING"
                        }
                        onClick={() => activate(r.accountId)}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        disabled={
                          busyAccountId === r.accountId ||
                          r.accountState === "SUSPENDED"
                        }
                        onClick={() => suspend(r.accountId)}
                      >
                        Suspend
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      )}
    </div>
  );
}
