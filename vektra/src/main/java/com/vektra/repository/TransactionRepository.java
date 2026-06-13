package com.vektra.repository;

import com.vektra.entity.Transaction;
import com.vektra.enums.TransactionStatus;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TransactionRepository extends JpaRepository<Transaction, Long> {

    List<Transaction> findAllByUserIdOrderByCreatedAtDesc(Long userId);

    boolean existsByTaskCompletionId(Long taskCompletionId);

    /**
     * Ledger balance: credit-positive sign by transaction type.
     *
     *   EARN, TRANSFER_IN   →  +amount
     *   SPEND, TRANSFER_OUT →  -amount
     *
     * Computed in SQL (not Java) so a user with 100k transactions still resolves
     * in a single round-trip. {@code COALESCE} keeps the return non-null when
     * the user has no rows yet.
     */
    @Query(
            "SELECT COALESCE(SUM("
                    + "  CASE "
                    + "    WHEN t.type = com.vektra.enums.TransactionType.EARN "
                    + "      OR t.type = com.vektra.enums.TransactionType.TRANSFER_IN THEN t.amount "
                    + "    ELSE -t.amount "
                    + "  END"
                    + "), 0) "
                    + "FROM VektraTransaction t "
                    + "WHERE t.userId = :userId AND t.status = :status")
    Long sumSignedAmountByUserIdAndStatus(
            @Param("userId") Long userId, @Param("status") TransactionStatus status);
}
