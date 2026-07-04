package com.vektra.repository;

import com.vektra.entity.Account;
import com.vektra.enums.AccountState;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountRepository extends JpaRepository<Account, Long> {

    boolean existsByEmailIgnoreCase(String email);

    Optional<Account> findByUserId(Long userId);

    Optional<Account> findByEmailIgnoreCase(String email);

    List<Account> findAllByAccountState(AccountState accountState);
}
