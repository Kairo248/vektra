-- =============================================================================
-- Migration 001: transactions.type — support peer-to-peer transfers
-- =============================================================================
-- Run manually against staging/production MySQL (e.g. Clever Cloud console).
-- Do NOT rely on spring.jpa.hibernate.ddl-auto=update to expand MySQL ENUM
-- values — Hibernate will not always alter an existing ENUM column when new
-- Java enum constants (TRANSFER_IN, TRANSFER_OUT) are added.
--
-- Symptom if skipped:
--   POST /v1/users/{id}/transfers → HTTP 500
--   Log: "Data truncated for column 'type' at row 1"
--
-- Safe to re-run: MODIFY to VARCHAR(20) is idempotent if already applied.
-- =============================================================================

-- 1. Inspect current definition (optional)
-- SHOW COLUMNS FROM transactions LIKE 'type';

-- 2. Apply fix — matches JPA @Enumerated(EnumType.STRING) on Transaction.type
ALTER TABLE transactions
  MODIFY COLUMN type VARCHAR(20) NOT NULL;

-- 3. Verify (optional)
-- SHOW COLUMNS FROM transactions LIKE 'type';
-- Expected: Type = varchar(20)
