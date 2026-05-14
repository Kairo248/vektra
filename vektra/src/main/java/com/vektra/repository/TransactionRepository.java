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

    @Query(
            "SELECT COALESCE(SUM(t.amount), 0) FROM VektraTransaction t WHERE t.userId = :userId AND t.status = :status")
    Long sumAmountByUserIdAndStatus(@Param("userId") Long userId, @Param("status") TransactionStatus status);
}
