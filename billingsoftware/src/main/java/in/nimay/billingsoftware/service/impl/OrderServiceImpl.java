package in.nimay.billingsoftware.service.impl;

import in.nimay.billingsoftware.entity.OrderEntity;
import in.nimay.billingsoftware.entity.OrderItemEntity;
import in.nimay.billingsoftware.io.OrderItemResponse;
import in.nimay.billingsoftware.io.OrderRequest;
import in.nimay.billingsoftware.io.OrderResponse;
import in.nimay.billingsoftware.io.PaymentDetails;
import in.nimay.billingsoftware.repository.OrderEntityRepository;
import in.nimay.billingsoftware.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private final OrderEntityRepository orderEntityRepository;

    @Override
    @Transactional
    public OrderResponse createOrder(OrderRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order request cannot be null.");
        }

        if (request.getCustomerName() == null || request.getCustomerName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Customer name is required.");
        }

        if (request.getPhoneNumber() == null || request.getPhoneNumber().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Phone number is required.");
        }

        if (request.getCartItems() == null || request.getCartItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cart must contain at least one item.");
        }

        BigDecimal calculatedSubtotal = BigDecimal.ZERO;
        for (var item : request.getCartItems()) {
            BigDecimal price = item.getPrice() != null ? item.getPrice() : BigDecimal.ZERO;
            int qty = item.getQuantity() != null && item.getQuantity() > 0 ? item.getQuantity() : 1;
            calculatedSubtotal = calculatedSubtotal.add(price.multiply(BigDecimal.valueOf(qty)));
        }

        BigDecimal subtotal = request.getSubtotal() != null ? request.getSubtotal() : calculatedSubtotal;
        BigDecimal tax = request.getTax() != null ? request.getTax() : BigDecimal.ZERO;
        BigDecimal grandTotal = request.getGrandTotal() != null ? request.getGrandTotal() : subtotal.add(tax);
        String paymentMethod = (request.getPaymentMethod() != null && !request.getPaymentMethod().trim().isEmpty())
                ? request.getPaymentMethod().toUpperCase()
                : "CASH";

        String orderId = UUID.randomUUID().toString();
        LocalDateTime now = LocalDateTime.now();

        OrderEntity orderEntity = OrderEntity.builder()
                .orderId(orderId)
                .customerName(request.getCustomerName().trim())
                .phoneNumber(request.getPhoneNumber().trim())
                .subtotal(subtotal)
                .tax(tax)
                .grandTotal(grandTotal)
                .paymentMethod(paymentMethod)
                .createdAt(now)
                .items(new ArrayList<>())
                .build();

        List<OrderItemEntity> orderItems = request.getCartItems().stream()
                .map(itemReq -> OrderItemEntity.builder()
                        .itemId(itemReq.getItemId())
                        .name(itemReq.getName())
                        .price(itemReq.getPrice())
                        .quantity(itemReq.getQuantity() != null && itemReq.getQuantity() > 0 ? itemReq.getQuantity() : 1)
                        .order(orderEntity)
                        .build())
                .toList();

        orderEntity.getItems().addAll(orderItems);

        OrderEntity savedOrder = orderEntityRepository.save(orderEntity);
        return convertToResponse(savedOrder);
    }

    @Override
    public List<OrderResponse> getOrders() {
        return orderEntityRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::convertToResponse)
                .toList();
    }

    @Override
    public OrderResponse getOrderByOrderId(String orderId) {
        OrderEntity order = orderEntityRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found with id: " + orderId));
        return convertToResponse(order);
    }

    private OrderResponse convertToResponse(OrderEntity entity) {
        List<OrderItemResponse> itemResponses = entity.getItems() != null
                ? entity.getItems().stream()
                .map(item -> OrderItemResponse.builder()
                        .itemId(item.getItemId())
                        .name(item.getName())
                        .price(item.getPrice())
                        .quantity(item.getQuantity())
                        .build())
                .toList()
                : List.of();

        PaymentDetails paymentDetails = PaymentDetails.builder()
                .paymentMethod(entity.getPaymentMethod())
                .status("COMPLETED")
                .transactionId("TXN-" + entity.getOrderId().substring(0, 8).toUpperCase())
                .build();

        return OrderResponse.builder()
                .orderId(entity.getOrderId())
                .customerName(entity.getCustomerName())
                .phoneNumber(entity.getPhoneNumber())
                .cartItems(itemResponses)
                .subtotal(entity.getSubtotal())
                .tax(entity.getTax())
                .grandTotal(entity.getGrandTotal())
                .paymentMethod(entity.getPaymentMethod())
                .createdAt(entity.getCreatedAt())
                .paymentDetails(paymentDetails)
                .build();
    }

}
