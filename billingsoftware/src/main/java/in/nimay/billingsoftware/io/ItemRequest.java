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
public class ItemRequest {

    private String name;
    private BigDecimal price;
    private BigDecimal originalPrice;
    private String categoryId;
    private String description;
    private String brand;
    private String sizes;
    private String color;
    private String fabric;
    private Integer stock;
    private String imageUrl;
    private String imgUrl;

}
