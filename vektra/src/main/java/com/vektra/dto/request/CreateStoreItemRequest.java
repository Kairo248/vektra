package com.vektra.dto.request;

import com.vektra.enums.StoreItemStatus;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateStoreItemRequest {

    @NotBlank
    @Size(max = 200)
    private String name;

    @NotBlank
    @Size(max = 2000)
    private String description;

    @NotNull
    @Min(1)
    private Integer priceAmount;

    /** {@code null} = unlimited stock. */
    @Min(0)
    private Integer stock;

    @Size(max = 100)
    private String category;

    private StoreItemStatus status;
}
