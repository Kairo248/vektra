package com.vektra.controller;

import com.vektra.dto.response.JourneyBackfillSummary;
import com.vektra.dto.response.MemberJourneyEventResponse;
import com.vektra.dto.response.MemberJourneyResponse;
import com.vektra.service.MemberJourneyService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Admin read APIs for member journey timelines. Events are append-only — no PUT/DELETE.
 * Historical rows are populated via {@link #backfill} or automatically on new domain actions.
 */
@RestController
@RequestMapping("/v1/admin/journey")
@RequiredArgsConstructor
public class MemberJourneyController {

    private final MemberJourneyService memberJourneyService;

    @GetMapping("/users/{userId}")
    public MemberJourneyResponse getUserJourney(@PathVariable Long userId) {
        return memberJourneyService.getUserJourney(userId);
    }

    @GetMapping("/events/{eventId}")
    public MemberJourneyEventResponse getEventById(@PathVariable Long eventId) {
        return memberJourneyService.getEventById(eventId);
    }

    /** Idempotent backfill from OLTP. Optional {@code userId} scopes to one member. */
    @PostMapping("/backfill")
    public JourneyBackfillSummary backfill(@RequestParam(required = false) Long userId) {
        return memberJourneyService.backfill(userId);
    }
}
