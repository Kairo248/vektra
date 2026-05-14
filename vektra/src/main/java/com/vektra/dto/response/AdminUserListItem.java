package com.vektra.dto.response;

import com.vektra.enums.AccountState;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminUserListItem {

    private Long userId;
    private String name;
    private String surname;
    private Long accountId;
    private String email;
    private AccountState accountState;
}
