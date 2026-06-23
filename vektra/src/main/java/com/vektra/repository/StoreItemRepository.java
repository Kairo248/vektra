package com.vektra.repository;

import com.vektra.entity.StoreItem;
import com.vektra.enums.StoreItemStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StoreItemRepository extends JpaRepository<StoreItem, Long> {

    List<StoreItem> findAllByStatusOrderByCreatedAtDesc(StoreItemStatus status);

    List<StoreItem> findAllByOrderByCreatedAtDesc();

    List<StoreItem> findAllByStatusAndCategoryIgnoreCaseOrderByCreatedAtDesc(
            StoreItemStatus status, String category);

    List<StoreItem> findAllByCategoryIgnoreCaseOrderByCreatedAtDesc(String category);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM StoreItem s WHERE s.id = :id")
    Optional<StoreItem> findByIdForUpdate(@Param("id") Long id);
}
