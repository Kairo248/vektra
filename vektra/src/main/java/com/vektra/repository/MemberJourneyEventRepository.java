package com.vektra.repository;

import com.vektra.entity.MemberJourneyEvent;
import com.vektra.enums.JourneySourceType;
import com.vektra.enums.MemberJourneyEventType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberJourneyEventRepository extends JpaRepository<MemberJourneyEvent, Long> {

    boolean existsBySourceTypeAndSourceIdAndEventType(
            JourneySourceType sourceType, Long sourceId, MemberJourneyEventType eventType);

    List<MemberJourneyEvent> findAllByUserIdOrderByOccurredAtAsc(Long userId);

    List<MemberJourneyEvent> findAllByUserIdOrderByOccurredAtDesc(Long userId);
}
