package in.nimay.billingsoftware.io;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class OrderRequest {

    private String customerName;
    private String phoneNumber;
    private String addressLine;
    private String pincode;
    private String city;
    private String state;
    private String addressLabel;
    private String estimatedDelivery;
    private List<OrderItemRequest> cartItems;
    private BigDecimal subtotal;
    private BigDecimal deliveryFee;
    private BigDecimal tax;
    private BigDecimal grandTotal;
    private String paymentMethod;
    private String idempotencyKey;

}
