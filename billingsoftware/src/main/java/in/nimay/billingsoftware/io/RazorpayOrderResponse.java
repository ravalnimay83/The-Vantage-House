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
public class RazorpayOrderResponse {
    private String orderId;
    private String orderNumber;
    private String razorpayOrderId;
    private long amountPaise;
    private String currency;
    private String razorpayKeyId;
    private BigDecimal subtotal;
    private BigDecimal deliveryFee;
    private BigDecimal grandTotal;
    private String estimatedDelivery;
    private String customerName;
    private String phoneNumber;
    private String userEmail;
}
