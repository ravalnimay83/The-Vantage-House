package in.nimay.billingsoftware.io;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class OrderResponse {

    private String orderId;
    private String customerName;
    private String phoneNumber;
    private List<OrderItemResponse> cartItems;
    private BigDecimal subtotal;
    private BigDecimal tax;
    private BigDecimal grandTotal;
    private String paymentMethod;
    private LocalDateTime createdAt;
    private PaymentDetails paymentDetails;

}
