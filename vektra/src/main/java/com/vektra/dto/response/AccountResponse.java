package com.vektra.dto.response;

import com.vektra.enums.AccountState;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountResponse {

    private Long id;
    private Long userId;
    private String email;
    private AccountState accountState;
    private Instant createdAt;
    private Instant updatedAt;
}
