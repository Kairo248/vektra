"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  adminCreateTask,
  adminListTasks,
  adminUpdateTaskStatus,
} from "@/services/api";
import type {
  CreateTaskRequest,
  EarnType,
  TaskResponse,
  TaskStatus,
} from "@/types/vektra";
import { StatusBanner } from "@/components/StatusBanner";
import { StatCard } from "@/components/admin/StatCard";

type Filter = "ALL" | TaskStatus;

const FILTERS: { id: Filter; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "ACTIVE", label: "Active" },
  { id: "INACTIVE", label: "Inactive" },
];

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    text: string;
    kind: "success" | "error";
  } | null>(null);
  const [busyTaskId, setBusyTaskId] = useState<number | null>(null);
  const [confirmDeactivateId, setConfirmDeactivateId] = useState<number | null>(
    null
  );
  const [filter, setFilter] = useState<Filter>("ALL");
  const [search, setSearch] = useState("");
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTasks(await adminListTasks());
      setUpdatedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
    };
  }, []);

  function startConfirmDeactivate(taskId: number) {
    setConfirmDeactivateId(taskId);
    if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
    confirmTimeoutRef.current = setTimeout(() => {
      setConfirmDeactivateId((cur) => (cur === taskId ? null : cur));
    }, 6000);
  }

  function cancelConfirmDeactivate() {
    setConfirmDeactivateId(null);
    if (confirmTimeoutRef.current) clearTimeout(confirmTimeoutRef.current);
  }

  async function setStatus(taskId: number, status: TaskStatus) {
    setBusyTaskId(taskId);
    setFeedback(null);
    try {
      await adminUpdateTaskStatus(taskId, { status });
      setFeedback({
        text: `Task ${status === "ACTIVE" ? "activated" : "deactivated"}.`,
        kind: "success",
      });
      cancelConfirmDeactivate();
      await load();
    } catch (e) {
      setFeedback({
        text: e instanceof Error ? e.message : "Update failed",
        kind: "error",
      });
    } finally {
      setBusyTaskId(null);
    }
  }

  async function createTask(body: CreateTaskRequest) {
    setCreating(true);
    setFeedback(null);
    try {
      await adminCreateTask(body);
      setFeedback({ text: "Task created.", kind: "success" });
      setCreateOpen(false);
      await load();
    } catch (e) {
      setFeedback({
        text: e instanceof Error ? e.message : "Create failed",
        kind: "error",
      });
    } finally {
      setCreating(false);
    }
  }

  const stats = useMemo(() => {
    let active = 0;
    let inactive = 0;
    let totalReward = 0;
    for (const t of tasks) {
      if (t.status === "ACTIVE") active += 1;
      else inactive += 1;
      totalReward += Number(t.rewardAmount) || 0;
    }
    const avg = tasks.length > 0 ? Math.round(totalReward / tasks.length) : 0;
    return { total: tasks.length, active, inactive, avg };
  }, [tasks]);

  const counts = useMemo(() => {
    const c = { ALL: tasks.length, ACTIVE: 0, INACTIVE: 0 };
    for (const t of tasks) c[t.status] += 1;
    return c;
  }, [tasks]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (filter !== "ALL" && t.status !== filter) return false;
      if (!q) return true;
      const hay = `${t.name} ${t.description}`.toLowerCase();
      return hay.includes(q);
    });
  }, [tasks, filter, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
            Task management
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900">
            Tasks
          </h1>
          <p className="mt-1 text-sm text-zinc-600">
            Create new tasks and toggle their availability for users.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500">
            {updatedAt == null
              ? "Loading…"
              : `Updated ${formatTimeAgo(updatedAt)}`}
          </span>
          <button
            type="button"
            onClick={() => load()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshIcon
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <StatusBanner variant={feedback.kind === "error" ? "error" : "success"}>
          {feedback.text}
        </StatusBanner>
      )}
      {error && <StatusBanner variant="error">{error}</StatusBanner>}

      {/* KPI strip */}
      <section
        aria-label="Task metrics"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          label="Total tasks"
          value={loading && tasks.length === 0 ? null : stats.total}
          tone="sky"
          loading={loading && tasks.length === 0}
          icon={<ClipboardIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Active"
          value={loading && tasks.length === 0 ? null : stats.active}
          tone="emerald"
          loading={loading && tasks.length === 0}
          hint={
            loading && tasks.length === 0
              ? undefined
              : "Visible to users"
          }
          icon={<PlayIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Inactive"
          value={loading && tasks.length === 0 ? null : stats.inactive}
          tone="zinc"
          loading={loading && tasks.length === 0}
          hint={
            loading && tasks.length === 0
              ? undefined
              : stats.inactive === 0
                ? "All tasks live"
                : "Hidden from users"
          }
          icon={<PauseIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Avg. reward"
          value={loading && tasks.length === 0 ? null : stats.avg}
          tone="violet"
          loading={loading && tasks.length === 0}
          hint={
            loading && tasks.length === 0 ? undefined : "Across all tasks"
          }
          icon={<CoinIcon className="h-5 w-5" />}
        />
      </section>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => {
            const active = filter === f.id;
            const count = counts[f.id];
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                {f.label}
                <span
                  className={`inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums ${
                    active
                      ? "bg-white/20 text-white"
                      : "bg-zinc-100 text-zinc-700"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-zinc-400">
              <SearchIcon className="h-4 w-4" />
            </span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or description"
              className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-8 pr-8 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute inset-y-0 right-0 flex items-center px-2.5 text-zinc-400 hover:text-zinc-700"
              >
                <XIcon className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-800"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            New task
          </button>
        </div>
      </div>

      {/* Table card */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase tracking-wider text-zinc-600">
                <th className="px-5 py-3">Task</th>
                <th className="px-5 py-3">Reward</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && tasks.length === 0 ? (
                <SkeletonRows />
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      hasTasks={tasks.length > 0}
                      filter={filter}
                      search={search}
                      onClear={() => {
                        setFilter("ALL");
                        setSearch("");
                      }}
                      onCreate={() => setCreateOpen(true)}
                    />
                  </td>
                </tr>
              ) : (
                visible.map((t) => {
                  const isBusy = busyTaskId === t.id;
                  const isConfirming = confirmDeactivateId === t.id;
                  return (
                    <tr
                      key={t.id}
                      className={`border-b border-zinc-100 transition-colors last:border-b-0 ${
                        t.status === "INACTIVE"
                          ? "bg-zinc-50/40 hover:bg-zinc-50/70"
                          : "hover:bg-zinc-50"
                      }`}
                    >
                      <td className="px-5 py-3">
                        <p className="font-medium text-zinc-900">{t.name}</p>
                        <p className="mt-0.5 text-xs text-zinc-500 line-clamp-2">
                          {t.description}
                        </p>
                        <p className="mt-1 text-[11px] text-zinc-400">
                          #{t.id} · created {formatDate(t.createdAt)}
                        </p>
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-100 tabular-nums">
                          <CoinIcon className="h-3 w-3" />
                          {t.rewardAmount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <EarnTypeBadge type={t.earnType} />
                      </td>
                      <td className="px-5 py-3">
                        <TaskStatusBadge status={t.status} />
                      </td>
                      <td className="px-5 py-3">
                        {isConfirming ? (
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <span className="text-xs font-medium text-rose-700">
                              Deactivate this task?
                            </span>
                            <button
                              type="button"
                              onClick={() => setStatus(t.id, "INACTIVE")}
                              disabled={isBusy}
                              className="inline-flex items-center gap-1.5 rounded-md bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-60"
                            >
                              {isBusy ? (
                                <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <PauseIcon className="h-3.5 w-3.5" />
                              )}
                              Yes, deactivate
                            </button>
                            <button
                              type="button"
                              onClick={cancelConfirmDeactivate}
                              disabled={isBusy}
                              className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            {t.status === "INACTIVE" ? (
                              <button
                                type="button"
                                onClick={() => setStatus(t.id, "ACTIVE")}
                                disabled={isBusy}
                                className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:opacity-60"
                              >
                                {isBusy ? (
                                  <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <PlayIcon className="h-3.5 w-3.5" />
                                )}
                                Activate
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => startConfirmDeactivate(t.id)}
                                disabled={isBusy}
                                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium text-rose-700 transition hover:border-rose-200 hover:bg-rose-50 disabled:opacity-60"
                              >
                                <PauseIcon className="h-3.5 w-3.5" />
                                Deactivate
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-zinc-200 bg-zinc-50/50 px-5 py-2.5 text-xs text-zinc-500">
          <span>
            Showing{" "}
            <span className="font-semibold tabular-nums text-zinc-700">
              {visible.length}
            </span>{" "}
            of{" "}
            <span className="font-semibold tabular-nums text-zinc-700">
              {tasks.length}
            </span>{" "}
            tasks
          </span>
          {filter !== "ALL" && (
            <button
              type="button"
              onClick={() => setFilter("ALL")}
              className="font-medium text-emerald-700 hover:text-emerald-800"
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      {createOpen && (
        <CreateTaskDialog
          saving={creating}
          onCancel={() => {
            if (!creating) setCreateOpen(false);
          }}
          onSave={(values) => createTask(values)}
        />
      )}
    </div>
  );
}

/* --- create dialog --- */

function CreateTaskDialog({
  saving,
  onCancel,
  onSave,
}: {
  saving: boolean;
  onCancel: () => void;
  onSave: (values: CreateTaskRequest) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rewardAmount, setRewardAmount] = useState("100");
  const [earnType, setEarnType] = useState<EarnType>("MANUAL");
  const [localError, setLocalError] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !saving) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel, saving]);

  const trimmedName = name.trim();
  const trimmedDescription = description.trim();
  const amount = Number(rewardAmount);
  const amountValid = Number.isFinite(amount) && amount >= 1;
  const canSave =
    !saving &&
    trimmedName.length > 0 &&
    trimmedDescription.length > 0 &&
    amountValid;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (!amountValid) {
      setLocalError("Reward must be a positive number.");
      return;
    }
    if (!canSave) return;
    onSave({
      name: trimmedName,
      description: trimmedDescription,
      rewardAmount: amount,
      earnType,
      status: "ACTIVE",
    });
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-task-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      <form
        onSubmit={submit}
        className="relative w-full max-w-lg overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-2xl ring-1 ring-zinc-900/5"
      >
        <div className="flex items-start justify-between gap-3 border-b border-zinc-200 px-5 py-4">
          <div>
            <h3
              id="create-task-title"
              className="text-base font-semibold text-zinc-900"
            >
              New task
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              Tasks are created as <span className="font-medium">ACTIVE</span>{" "}
              and immediately visible to users.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            aria-label="Close"
            className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:opacity-60"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          {localError && (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-800">
              {localError}
            </div>
          )}

          <div>
            <label
              htmlFor="t-name"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-600"
            >
              Name
            </label>
            <input
              id="t-name"
              ref={firstFieldRef}
              type="text"
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={saving}
              placeholder="e.g. Watch onboarding video"
              className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 disabled:bg-zinc-50"
            />
          </div>

          <div>
            <label
              htmlFor="t-desc"
              className="block text-xs font-semibold uppercase tracking-wider text-zinc-600"
            >
              Description
            </label>
            <textarea
              id="t-desc"
              required
              rows={3}
              maxLength={500}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={saving}
              placeholder="What should the user do to complete this task?"
              className="mt-1.5 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 disabled:bg-zinc-50"
            />
            <p className="mt-1 text-[11px] text-zinc-400">
              {description.length}/500
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="t-reward"
                className="block text-xs font-semibold uppercase tracking-wider text-zinc-600"
              >
                Reward amount
              </label>
              <div className="relative mt-1.5">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-400">
                  <CoinIcon className="h-4 w-4" />
                </span>
                <input
                  id="t-reward"
                  type="number"
                  min={1}
                  required
                  value={rewardAmount}
                  onChange={(e) => setRewardAmount(e.target.value)}
                  disabled={saving}
                  className="w-full rounded-lg border border-zinc-300 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 disabled:bg-zinc-50"
                />
              </div>
            </div>

            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-zinc-600">
                Earn type
              </span>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                {(["MANUAL", "AUTOMATIC"] as EarnType[]).map((t) => {
                  const active = earnType === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setEarnType(t)}
                      disabled={saving}
                      className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                        active
                          ? "border-emerald-600 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-600/20"
                          : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
                      } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1 text-[11px] text-zinc-400">
                {earnType === "MANUAL"
                  ? "Submissions need admin approval."
                  : "Auto-approved on submission."}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-zinc-200 bg-zinc-50/50 px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canSave}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <SpinnerIcon className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <PlusIcon className="h-3.5 w-3.5" />
            )}
            Create task
          </button>
        </div>
      </form>
    </div>
  );
}

/* --- badges --- */

function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const styles =
    status === "ACTIVE"
      ? "bg-emerald-50 text-emerald-800 ring-emerald-100"
      : "bg-zinc-100 text-zinc-700 ring-zinc-200";
  const dot =
    status === "ACTIVE" ? "bg-emerald-500 shadow-emerald-500/40" : "bg-zinc-400";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${styles}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full shadow-[0_0_6px_2px] ${dot}`}
      />
      {status}
    </span>
  );
}

function EarnTypeBadge({ type }: { type: EarnType }) {
  const styles =
    type === "AUTOMATIC"
      ? "bg-sky-50 text-sky-800 ring-sky-100"
      : "bg-violet-50 text-violet-800 ring-violet-100";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${styles}`}
    >
      {type === "AUTOMATIC" ? (
        <BoltIcon className="h-3 w-3" />
      ) : (
        <HandIcon className="h-3 w-3" />
      )}
      {type}
    </span>
  );
}

/* --- empty + skeleton --- */

function EmptyState({
  hasTasks,
  filter,
  search,
  onClear,
  onCreate,
}: {
  hasTasks: boolean;
  filter: Filter;
  search: string;
  onClear: () => void;
  onCreate: () => void;
}) {
  const filtered = hasTasks && (filter !== "ALL" || search.trim().length > 0);
  return (
    <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200">
        <ClipboardIcon className="h-5 w-5" />
      </span>
      <p className="mt-3 text-sm font-medium text-zinc-900">
        {filtered ? "No tasks match your filters" : "No tasks yet"}
      </p>
      <p className="mt-0.5 text-xs text-zinc-500">
        {filtered
          ? "Try clearing the search or filter to see more results."
          : "Create your first task to make it available to users."}
      </p>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        {filtered ? (
          <button
            type="button"
            onClick={onClear}
            className="text-xs font-medium text-emerald-700 hover:text-emerald-800"
          >
            Clear filters
          </button>
        ) : (
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-800"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            Create task
          </button>
        )}
      </div>
    </div>
  );
}

function SkeletonRows() {
  return (
    <>
      {[0, 1, 2, 3].map((i) => (
        <tr key={i} className="border-b border-zinc-100 last:border-b-0">
          <td className="px-5 py-3">
            <div className="space-y-1.5">
              <div className="h-3.5 w-44 animate-pulse rounded bg-zinc-100" />
              <div className="h-3 w-64 animate-pulse rounded bg-zinc-100" />
              <div className="h-2.5 w-32 animate-pulse rounded bg-zinc-100" />
            </div>
          </td>
          <td className="px-5 py-3">
            <div className="h-5 w-14 animate-pulse rounded-full bg-zinc-100" />
          </td>
          <td className="px-5 py-3">
            <div className="h-5 w-20 animate-pulse rounded-full bg-zinc-100" />
          </td>
          <td className="px-5 py-3">
            <div className="h-5 w-16 animate-pulse rounded-full bg-zinc-100" />
          </td>
          <td className="px-5 py-3">
            <div className="flex justify-end">
              <div className="h-7 w-24 animate-pulse rounded-md bg-zinc-100" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

/* --- helpers --- */

function formatTimeAgo(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/* --- icons --- */

function ClipboardIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="8" y="3" width="8" height="4" rx="1" />
      <path d="M16 5h2a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2" />
      <path d="M9 12h6" />
      <path d="M9 16h4" />
    </svg>
  );
}

function PlayIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M8 5.5v13l11-6.5L8 5.5z" />
    </svg>
  );
}

function PauseIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <rect x="6" y="5" width="4" height="14" rx="1" />
      <rect x="14" y="5" width="4" height="14" rx="1" />
    </svg>
  );
}

function CoinIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v10" />
      <path d="M9.5 9.5h4a2 2 0 1 1 0 4h-3a2 2 0 1 0 0 4h4" />
    </svg>
  );
}

function BoltIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  );
}

function HandIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M9 11V5a1.5 1.5 0 0 1 3 0v5" />
      <path d="M12 10V4a1.5 1.5 0 0 1 3 0v7" />
      <path d="M15 11V6a1.5 1.5 0 0 1 3 0v9a6 6 0 0 1-6 6h-1.5a4.5 4.5 0 0 1-4-2.4l-3-5.7a1.5 1.5 0 0 1 2.5-1.6L8 14" />
    </svg>
  );
}

function PlusIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function RefreshIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M21 12a9 9 0 1 1-3.5-7.1" />
      <path d="M21 4v5h-5" />
    </svg>
  );
}

function SearchIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

function XIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

function SpinnerIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
