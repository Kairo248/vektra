package com.vektra.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateStoreItemRequest {

    @Size(max = 200)
    private String name;

    @Size(max = 2000)
    private String description;

    @Min(1)
    private Integer priceAmount;

    /** {@code null} when omitted; explicit {@code null} in JSON clears to unlimited is not supported — send a PATCH without the field to leave stock unchanged. */
    @Min(0)
    private Integer stock;

    /** When {@code true}, sets stock to unlimited ({@code null}). */
    private Boolean unlimitedStock;

    @Size(max = 100)
    private String category;
}
