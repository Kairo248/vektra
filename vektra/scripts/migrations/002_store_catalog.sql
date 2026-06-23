-- =============================================================================
-- Migration 002: store catalog (Factory) + purchases (Shop)
-- =============================================================================
-- Run manually against staging/production MySQL (e.g. Clever Cloud console).
-- Hibernate ddl-auto=update may create these on a fresh DB, but long-lived
-- databases should apply this script explicitly.
--
-- Safe to re-run: uses IF NOT EXISTS / information_schema guards where possible.
-- =============================================================================

CREATE TABLE IF NOT EXISTS store_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description VARCHAR(2000) NOT NULL,
    price_amount INT NOT NULL,
    status VARCHAR(20) NOT NULL,
    stock INT NULL,
    category VARCHAR(100) NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
);

CREATE TABLE IF NOT EXISTS purchases (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    store_item_id BIGINT NOT NULL,
    amount_paid INT NOT NULL,
    status VARCHAR(20) NOT NULL,
    created_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    INDEX idx_purchases_user_id (user_id),
    INDEX idx_purchases_store_item_id (store_item_id)
);

-- Add ledger links for SPEND rows from purchases (skip if already present).
SET @has_purchase_id := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'transactions'
      AND COLUMN_NAME = 'purchase_id'
);
SET @ddl_purchase_id := IF(
    @has_purchase_id = 0,
    'ALTER TABLE transactions ADD COLUMN purchase_id BIGINT NULL',
    'SELECT 1'
);
PREPARE stmt FROM @ddl_purchase_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_store_item_id := (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'transactions'
      AND COLUMN_NAME = 'store_item_id'
);
SET @ddl_store_item_id := IF(
    @has_store_item_id = 0,
    'ALTER TABLE transactions ADD COLUMN store_item_id BIGINT NULL',
    'SELECT 1'
);
PREPARE stmt FROM @ddl_store_item_id;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
