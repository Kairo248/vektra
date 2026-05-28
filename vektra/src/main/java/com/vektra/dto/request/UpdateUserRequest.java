package com.vektra.dto.request;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * PATCH-style payload for /v1/users/{id}. Fields are nullable so callers can
 * send only the attributes they want to change. A null field means "leave
 * unchanged"; an empty/blank string is rejected by the service layer.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserRequest {

    @Size(min = 1, max = 120)
    private String name;

    @Size(min = 1, max = 120)
    private String surname;
}
