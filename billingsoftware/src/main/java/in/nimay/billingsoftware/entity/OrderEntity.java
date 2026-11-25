package in.nimay.billingsoftware.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tbl_orders")
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class OrderEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String orderId;

    private String orderNumber;

    private String customerName;

    private String phoneNumber;

    private String userEmail;

    @Column(length = 500)
    private String addressLine;

    private String pincode;

    private String city;

    private String state;

    private String addressLabel;

    private String estimatedDelivery;

    private BigDecimal subtotal;

    private BigDecimal deliveryFee;

    private BigDecimal tax;

    private BigDecimal grandTotal;

    private String paymentMethod;

    private String paymentStatus;

    private String orderStatus;

    private String paymentChannel;

    private String razorpayOrderId;

    private String razorpayPaymentId;

    private String razorpaySignature;

    @Column(unique = true)
    private String idempotencyKey;

    @Builder.Default
    private Boolean stockDeducted = false;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OrderItemEntity> items = new ArrayList<>();

}
