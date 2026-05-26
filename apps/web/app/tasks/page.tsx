"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  completeTask,
  getAccountForUser,
  getTasks,
} from "@/services/api";
import { getStoredUserId } from "@/lib/session";
import type { AccountResponse, TaskResponse } from "@/types/vektra";
import { StatusBanner } from "@/components/StatusBanner";

export default function TasksPage() {
  const [userId, setUserId] = useState<number | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [account, setAccount] = useState<AccountResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const canComplete = account?.accountState === "ACTIVE";

  useEffect(() => {
    setUserId(getStoredUserId());
    setSessionChecked(true);
  }, []);

  useEffect(() => {
    if (!sessionChecked) return;
    if (!userId) {
      setLoading(false);
      setError("No user in session. Sign up first.");
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [list, acc] = await Promise.all([
          getTasks(),
          getAccountForUser(userId),
        ]);
        if (!cancelled) {
          setTasks(list);
          setAccount(acc);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load tasks");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, sessionChecked]);

  async function onComplete(taskId: number) {
    if (!userId || !canComplete) return;
    setActionId(taskId);
    setActionMsg(null);
    try {
      const res = await completeTask(userId, taskId);
      setActionMsg(
        res.status === "APPROVED"
          ? "Task completed — reward credited (if automatic)."
          : "Submitted — waiting for approval (manual task)."
      );
    } catch (e) {
      setActionMsg(e instanceof Error ? e.message : "Could not complete task");
    } finally {
      setActionId(null);
    }
  }

  if (sessionChecked && !userId) {
    return (
      <div className="space-y-4">
        <StatusBanner variant="error">Sign up to view tasks.</StatusBanner>
        <Link
          href="/signup"
          className="inline-block rounded-lg bg-emerald-700 px-4 py-2 text-sm text-white"
        >
          Sign up
        </Link>
      </div>
    );
  }

  if (!sessionChecked || loading) {
    return (
      <p className="text-sm text-zinc-600" role="status">
        Loading tasks…
      </p>
    );
  }

  if (error) {
    return <StatusBanner variant="error">{error}</StatusBanner>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Tasks</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Active tasks from the Vektra API.
        </p>
      </div>

      {!canComplete && account && (
        <StatusBanner variant="info">
          Account is <strong>{account.accountState}</strong>. Complete task is
          disabled until your account is <strong>ACTIVE</strong>.
        </StatusBanner>
      )}

      {actionMsg && (
        <StatusBanner
          variant={actionMsg.includes("Could not") ? "error" : "success"}
        >
          {actionMsg}
        </StatusBanner>
      )}

      <ul className="space-y-3">
        {tasks.length === 0 && (
          <li className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center text-sm text-zinc-500">
            No active tasks.
          </li>
        )}
        {tasks.map((t) => (
          <li
            key={t.id}
            className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h2 className="font-semibold text-zinc-900">{t.name}</h2>
              <p className="mt-1 line-clamp-2 text-sm text-zinc-600">
                {t.description}
              </p>
              <p className="mt-2 text-xs text-zinc-500">
                Reward: <strong>{t.rewardAmount}</strong> · {t.earnType}
              </p>
            </div>
            <button
              type="button"
              disabled={!canComplete || actionId === t.id}
              onClick={() => onComplete(t.id)}
              className="shrink-0 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {actionId === t.id ? "Working…" : "Complete task"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
