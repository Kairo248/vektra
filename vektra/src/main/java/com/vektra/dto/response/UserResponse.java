package com.vektra.dto.response;

import com.vektra.enums.UserType;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {

    private Long id;
    private String name;
    private String surname;
    private UserType userType;
    private Instant createdAt;
}
