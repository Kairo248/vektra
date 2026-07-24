package com.vektra.enums;

/** OLTP table that originated a journey event (for idempotency and deep links). */
public enum JourneySourceType {
    USER,
    ACCOUNT,
    TRANSACTION,
    PURCHASE
}
