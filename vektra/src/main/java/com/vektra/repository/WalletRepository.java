package com.vektra.repository;

import com.vektra.entity.Wallet;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WalletRepository extends JpaRepository<Wallet, Long> {

    Optional<Wallet> findByUserId(Long userId);

    /**
     * Pessimistic row-level lock on a user's wallet — held until the surrounding
     * {@code @Transactional} commits or rolls back. Used by the transfer flow
     * to serialize concurrent debits from the same sender: without it, two
     * parallel transfer requests could both read the same balance, both pass
     * the "enough funds" check, and both insert ledger rows — overdraft.
     *
     * Translates to {@code SELECT ... FOR UPDATE} on MySQL/Postgres. The wallet
     * row itself doesn't carry a balance — it's a stable identity row whose
     * sole purpose here is to act as the lock target for any operation that
     * mutates this user's ledger.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT w FROM Wallet w WHERE w.userId = :userId")
    Optional<Wallet> findByUserIdForUpdate(@Param("userId") Long userId);
}
