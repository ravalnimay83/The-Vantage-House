package in.nimay.billingsoftware.io;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class CartItemDto {
    private String itemId;
    private String name;
    private BigDecimal price;
    private Integer quantity;
    private String size;
    private String color;
    private String imageUrl;
    private String categoryName;
    private Integer stock;
}
