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
public class OrderItemRequest {

    private String itemId;
    private String name;
    private String size;
    private String color;
    private String imgUrl;
    private BigDecimal price;
    private Integer quantity;

}
