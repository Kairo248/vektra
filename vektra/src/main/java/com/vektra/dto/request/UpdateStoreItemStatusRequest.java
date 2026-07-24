package com.vektra.dto.request;

import com.vektra.enums.StoreItemStatus;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateStoreItemStatusRequest {

    @NotNull
    private StoreItemStatus status;
}
