package com.vektra.dto.response;

import com.vektra.enums.AccountState;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MemberJourneyResponse {

    private Long userId;
    private String name;
    private String surname;
    private String email;
    private AccountState accountState;
    private Long balance;
    private List<MemberJourneyEventResponse> events;
}
