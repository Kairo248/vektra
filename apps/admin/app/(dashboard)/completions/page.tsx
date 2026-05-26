"use client";

import { useCallback, useEffect, useState } from "react";
import {
  adminApproveCompletion,
  adminListTaskCompletions,
  adminRejectCompletion,
} from "@/services/api";
import type { TaskCompletionResponse } from "@/types/vektra";
import { Button } from "@/components/ui/Button";
import { Table, Th, Td } from "@/components/ui/Table";
import { StatusBanner } from "@/components/StatusBanner";

export default function AdminCompletionsPage() {
  const [rows, setRows] = useState<TaskCompletionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(await adminListTaskCompletions("PENDING"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load completions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function approve(id: number) {
    setBusyId(id);
    setFeedback(null);
    try {
      await adminApproveCompletion(id);
      setFeedback("Approved — reward applied for eligible tasks.");
      await load();
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: number) {
    setBusyId(id);
    setFeedback(null);
    try {
      await adminRejectCompletion(id);
      setFeedback("Completion rejected.");
      await load();
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "Reject failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Task completions</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Pending manual reviews (MANUAL earn type).
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
        <p className="text-sm text-zinc-600">Loading…</p>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Completion</Th>
              <Th>User</Th>
              <Th>Task</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <Td colSpan={5} className="py-8 text-center text-zinc-500">
                  No pending completions.
                </Td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="bg-amber-50/40">
                  <Td className="font-mono text-xs">#{r.id}</Td>
                  <Td>{r.userId}</Td>
                  <Td>
                    <span className="font-medium text-zinc-900">{r.taskName}</span>
                    <span className="ml-2 font-mono text-xs text-zinc-500">#{r.taskId}</span>
                  </Td>
                  <Td className="font-medium text-amber-900">{r.status}</Td>
                  <Td className="text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      <Button
                        variant="primary"
                        disabled={busyId === r.id}
                        onClick={() => approve(r.id)}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        disabled={busyId === r.id}
                        onClick={() => reject(r.id)}
                      >
                        Reject
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
