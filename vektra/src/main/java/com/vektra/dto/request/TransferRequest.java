package com.vektra.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Peer-to-peer transfer payload.
 *
 * The sender is taken from the URL path ({@code /v1/users/{senderId}/transfers}) — the body
 * only describes the recipient and the amount.
 *
 * Identity strategy: {@code recipientId} is the single source of truth; {@code recipientEmail}
 * and {@code recipientName} are optional confirmation fields. When provided, the server
 * checks them against the actual recipient and rejects on mismatch. This is the
 * "Confirmation of Payee" pattern — it stops a sender from mistyping the ID and
 * silently sending Vektras to the wrong user.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransferRequest {

    @NotNull
    @Min(value = 1, message = "recipientId must be a positive user id")
    private Long recipientId;

    /** Optional confirmation field; validated against the recipient's actual email when present. */
    @Email
    @Size(max = 255)
    private String recipientEmail;

    /** Optional confirmation field; matched (case-insensitively, trimmed) against "name surname". */
    @Size(max = 255)
    private String recipientName;

    /**
     * Vektras to move. Stored as {@code Integer} on the Transaction entity, so the
     * column max is ~2.1B; the 1,000,000 cap here is a defensive limit to prevent
     * fat-finger sends — well above any realistic single-transfer use case.
     */
    @NotNull
    @Min(1)
    @Max(1_000_000)
    private Integer amount;
}
