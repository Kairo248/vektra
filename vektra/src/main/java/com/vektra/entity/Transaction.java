package com.vektra.entity;

import com.vektra.enums.TransactionStatus;
import com.vektra.enums.TransactionType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity(name = "VektraTransaction")
@Table(
        name = "transactions",
        uniqueConstraints =
                @UniqueConstraint(
                        name = "uk_transactions_task_completion",
                        columnNames = {"task_completion_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "task_id")
    private Long taskId;

    /**
     * When set, guarantees at most one COMPLETED earn per task completion (idempotent rewards).
     */
    @Column(name = "task_completion_id", unique = true)
    private Long taskCompletionId;

    /**
     * Correlates the two legs (TRANSFER_OUT + TRANSFER_IN) of a peer-to-peer transfer.
     * Null on EARN/SPEND rows that did not originate from a transfer.
     */
    @Column(name = "transfer_id", length = 36)
    private String transferId;

    /**
     * The other user involved in this row:
     *   TRANSFER_OUT → recipient's user_id
     *   TRANSFER_IN  → sender's user_id
     * Null on EARN/SPEND rows that did not originate from a transfer.
     */
    @Column(name = "counterparty_user_id")
    private Long counterpartyUserId;

    @Column(name = "purchase_id")
    private Long purchaseId;

    @Column(name = "store_item_id")
    private Long storeItemId;

    @Column(nullable = false)
    private Integer amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TransactionType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TransactionStatus status;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() {
        createdAt = Instant.now();
    }
}
