# Vektra Analytics — Metric Catalog (Phase 2)

**Status:** Draft v1 — P0 only  
**Owner:** Data Engineering (learning track)  
**Source of truth for money:** `transactions` ledger (not `wallets`)  
**Timezone:** UTC (matches Spring / MySQL `serverTimezone=UTC`)  
**Default user filter:** `users.user_type = 'USER'` unless noted  

This catalog is the contract for the future reporting database and ETL.  
If a dashboard number disagrees with a formula here, the catalog wins until we change it deliberately.

---

## P0 metrics (Executive)

### 1. New Users per Day

| Field | Definition |
|-------|------------|
| **Business question** | How many new member accounts registered each calendar day? |
| **Why we care** | Growth signal; also validates the daily simulation / signup funnel. |
| **Formula** | `COUNT(*)` of users with `user_type = 'USER'` whose `users.created_at` falls on that UTC day. |
| **Tables / columns** | `users.id`, `users.user_type`, `users.created_at` |
| **Grain** | One measure per calendar day (UTC). |
| **Filters** | Exclude `ADMIN`. Do not require `ACTIVE` — PENDING signups still count as new users. |
| **Known limitations** | Does not measure “activated” users. Simulation-created users are included (indistinguishable by design). |

---

### 2. Daily Active Users (DAU) — activity-based

| Field | Definition |
|-------|------------|
| **Business question** | How many members performed at least one meaningful action on that day? |
| **Why we care** | Engagement, not vanity registration counts. |
| **Formula** | Count of distinct `user_id` that appear in **any** of the following on that UTC day, after joining to `users` / `accounts`: <br>1. `transactions` with `status = 'COMPLETED'` <br>2. `task_completions` (any status — attempt counts as activity) <br>3. `purchases` with `status = 'COMPLETED'` <br>User must be `user_type = 'USER'`. Prefer also `account_state = 'ACTIVE'` so PENDING users who somehow have no activity stay out; if a PENDING user somehow has a row, still count them only if they appear in the activity sources (today they should not earn/spend). |
| **Tables / columns** | `transactions.user_id`, `transactions.created_at`, `transactions.status` · `task_completions.user_id`, `task_completions.completed_at` · `purchases.user_id`, `purchases.created_at` · `users.user_type` · `accounts.account_state` |
| **Grain** | One measure per calendar day (UTC). |
| **Canonical definition (one sentence)** | **DAU = distinct USER-type members with ≥1 completed ledger event, task completion, or completed purchase on that UTC day.** |
| **Known limitations** | Not “opened the app.” No session / login table. Opening the shop without buying does not count. |

---

### 3. Total Rewards Distributed (daily)

| Field | Definition |
|-------|------------|
| **Business question** | How many Vektras did the platform credit to users as task rewards that day? |
| **Why we care** | Economy supply; detect runaway reward inflation. |
| **Formula** | `SUM(transactions.amount)` where `type = 'EARN'` AND `status = 'COMPLETED'` AND `DATE(created_at) = day`. |
| **Tables / columns** | `transactions.amount`, `transactions.type`, `transactions.status`, `transactions.created_at` |
| **Grain** | Per calendar day (UTC). All-time = same filter without day bound. |
| **Filters** | Ledger only. Do **not** use `tasks.reward_amount × completions` as the primary metric. |
| **Known limitations** | Excludes TRANSFER_IN (peer money, not platform reward). MANUAL completions only appear after approval creates the EARN row. |

---

### 4. Economy Net Flow (daily) — Earn vs Spend

| Field | Definition |
|-------|------------|
| **Business question** | Did the platform inject more Vektras (earn) than it sank (spend) that day? |
| **Why we care** | Inflation / deflation of the reward economy. |
| **Formula** | - `earn_volume` = `SUM(amount)` where `type = 'EARN'` AND `status = 'COMPLETED'` that day <br>- `spend_volume` = `SUM(amount)` where `type = 'SPEND'` AND `status = 'COMPLETED'` that day <br>- `net_platform_flow` = `earn_volume - spend_volume` <br>Transfers are **excluded** from this P0 metric (they move value between users; they do not change total supply). |
| **Tables / columns** | `transactions` as above |
| **Grain** | Per calendar day (UTC). |
| **Known limitations** | Does not equal “sum of all wallet balances” without a full ledger replay. Transfer volume is a separate P1 metric. |

---

### 5. Pending Account Backlog

| Field | Definition |
|-------|------------|
| **Business question** | How many member accounts are waiting for admin activation right now? |
| **Why we care** | Ops SLA; simulation fills this inbox; blocked users cannot transact. |
| **Formula** | `COUNT(*)` of `accounts` joined to `users` where `account_state = 'PENDING'` AND `user_type = 'USER'`. |
| **Tables / columns** | `accounts.account_state`, `accounts.user_id` · `users.user_type` |
| **Grain** | **Snapshot** (point-in-time), not a daily time series — unless we later add state-change history. |
| **Optional companion** | `new_pending_per_day` = PENDING accounts with `accounts.created_at` on that day (useful with simulation). |
| **Known limitations** | Snapshot only. Time-to-activate is unreliable from `updated_at` alone (any account update bumps it). |

---

## Explicitly out of scope (P0)

| Requested idea | Decision |
|----------------|----------|
| Reward by gender | **Blocked** — no gender attribute on `users`. Revisit when Product adds it. |
| Classic session DAU | **Deferred** — no login/session events. Use activity-based DAU above. |
| Retention cohorts | **P2** — defined later; needs cohort math, not required for first warehouse tables. |
| Transfer volume | **P1** — count distinct `transfer_id`, never double-count IN+OUT rows. |

---

## Naming conventions (for Phase 3+)

- Prefer metric names that include grain: `new_users_daily`, `rewards_distributed_daily`.
- Money metrics always specify `COMPLETED` ledger status.
- Document UTC in every daily rollup.

---

## Change log

| Date | Change |
|------|--------|
| 2026-07-11 | Initial P0 catalog (Phase 2 exercise). |
