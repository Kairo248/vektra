package com.vektra.repository;

import com.vektra.entity.FaceCredential;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FaceCredentialRepository extends JpaRepository<FaceCredential, Long> {

    Optional<FaceCredential> findByUserId(Long userId);

    boolean existsByUserId(Long userId);

    void deleteByUserId(Long userId);
}
