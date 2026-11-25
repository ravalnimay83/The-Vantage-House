package in.nimay.billingsoftware.io;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.sql.Timestamp;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ItemResponse {

    private String itemId;
    private String name;
    private BigDecimal price;
    private BigDecimal originalPrice;
    private String categoryId;
    private String description;
    private String categoryName;
    private String brand;
    private String sizes;
    private String color;
    private String fabric;
    private Integer stock;
    private String imageUrl;
    private Timestamp createdAt;
    private Timestamp updatedAt;

}
