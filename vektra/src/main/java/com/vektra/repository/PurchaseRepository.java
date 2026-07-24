package com.vektra.repository;

import com.vektra.entity.Purchase;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PurchaseRepository extends JpaRepository<Purchase, Long> {

    List<Purchase> findAllByUserIdOrderByCreatedAtDesc(Long userId);
}
