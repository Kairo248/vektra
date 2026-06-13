package com.vektra.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * {@code GET /v1/users/{userId}/face}. Lets the profile UI decide whether to
 * show "Enable face login" or "Disable face login". {@code enrolledAt} is
 * omitted from the JSON when {@code enrolled == false}.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class FaceStatusResponse {

    private boolean enrolled;
    private Instant enrolledAt;
}
