"use client";

import { useCallback, useEffect, useState } from "react";
import {
  adminCreateTask,
  adminListTasks,
  adminUpdateTaskStatus,
} from "@/services/api";
import type { EarnType, TaskResponse } from "@/types/vektra";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Select } from "@/components/ui/Select";
import { Table, Th, Td } from "@/components/ui/Table";
import { StatusBanner } from "@/components/StatusBanner";

export default function AdminTasksPage() {
  const [tasks, setTasks] = useState<TaskResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busyTaskId, setBusyTaskId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [rewardAmount, setRewardAmount] = useState("100");
  const [earnType, setEarnType] = useState<EarnType>("MANUAL");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTasks(await adminListTasks());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setFeedback(null);
    try {
      const amount = Number(rewardAmount);
      if (!Number.isFinite(amount) || amount < 1) {
        setFeedback("Reward must be a positive number.");
        return;
      }
      await adminCreateTask({
        name,
        description,
        rewardAmount: amount,
        earnType,
        status: "ACTIVE",
      });
      setFeedback("Task created.");
      setName("");
      setDescription("");
      setRewardAmount("100");
      setEarnType("MANUAL");
      await load();
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  async function setStatus(taskId: number, status: "ACTIVE" | "INACTIVE") {
    setBusyTaskId(taskId);
    setFeedback(null);
    try {
      await adminUpdateTaskStatus(taskId, { status });
      setFeedback(`Task ${status === "ACTIVE" ? "activated" : "deactivated"}.`);
      await load();
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusyTaskId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Tasks</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Create tasks and toggle availability for users.
        </p>
      </div>

      {feedback && (
        <StatusBanner variant={feedback.includes("failed") || feedback.includes("must") ? "error" : "success"}>
          {feedback}
        </StatusBanner>
      )}
      {error && <StatusBanner variant="error">{error}</StatusBanner>}

      <section className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900">Create task</h2>
        <form onSubmit={onCreate} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="t-name">Name</Label>
            <Input
              id="t-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="t-desc">Description</Label>
            <Input
              id="t-desc"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="t-reward">Reward amount</Label>
            <Input
              id="t-reward"
              type="number"
              min={1}
              required
              value={rewardAmount}
              onChange={(e) => setRewardAmount(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="t-earn">Earn type</Label>
            <Select
              id="t-earn"
              value={earnType}
              onChange={(e) => setEarnType(e.target.value as EarnType)}
              className="mt-1"
            >
              <option value="AUTOMATIC">AUTOMATIC</option>
              <option value="MANUAL">MANUAL</option>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={creating}>
              {creating ? "Creating…" : "Create task"}
            </Button>
          </div>
        </form>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900">All tasks</h2>
          <Button type="button" variant="secondary" onClick={() => load()} disabled={loading}>
            Refresh
          </Button>
        </div>
        {loading ? (
          <p className="text-sm text-zinc-600">Loading…</p>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Task</Th>
                <Th>Reward</Th>
                <Th>Type</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <Td colSpan={5} className="py-8 text-center text-zinc-500">
                    No tasks yet.
                  </Td>
                </tr>
              ) : (
                tasks.map((t) => (
                  <tr key={t.id}>
                    <Td>
                      <span className="font-medium">{t.name}</span>
                      <span className="mt-0.5 block text-xs text-zinc-500 line-clamp-2">
                        {t.description}
                      </span>
                    </Td>
                    <Td>{t.rewardAmount}</Td>
                    <Td>{t.earnType}</Td>
                    <Td>
                      <span
                        className={
                          t.status === "ACTIVE"
                            ? "font-medium text-emerald-800"
                            : "text-zinc-500"
                        }
                      >
                        {t.status}
                      </span>
                    </Td>
                    <Td className="text-right">
                      <div className="flex flex-wrap justify-end gap-2">
                        <Button
                          variant="secondary"
                          disabled={busyTaskId === t.id || t.status === "ACTIVE"}
                          onClick={() => setStatus(t.id, "ACTIVE")}
                        >
                          Activate
                        </Button>
                        <Button
                          variant="danger"
                          disabled={busyTaskId === t.id || t.status === "INACTIVE"}
                          onClick={() => setStatus(t.id, "INACTIVE")}
                        >
                          Deactivate
                        </Button>
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        )}
      </section>
    </div>
  );
}
