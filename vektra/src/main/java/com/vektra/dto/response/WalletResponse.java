package com.vektra.dto.response;

import com.vektra.enums.WalletState;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WalletResponse {

    private Long id;
    private Long userId;
    private WalletState walletState;
    private Instant createdAt;
    private Instant updatedAt;
}
