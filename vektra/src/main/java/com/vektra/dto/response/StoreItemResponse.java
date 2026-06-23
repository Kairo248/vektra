package com.vektra.dto.response;

import com.vektra.enums.StoreItemStatus;
import java.time.Instant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoreItemResponse {

    private Long id;
    private String name;
    private String description;
    private Integer priceAmount;
    private StoreItemStatus status;
    /** {@code null} = unlimited stock. */
    private Integer stock;
    private String category;
    private Instant createdAt;
    private Instant updatedAt;
}
