package com.vektra.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WalletBalanceResponse {

    private Long userId;
    /** Sum of amounts for all COMPLETED transactions (ledger balance). */
    private Long balance;
}
