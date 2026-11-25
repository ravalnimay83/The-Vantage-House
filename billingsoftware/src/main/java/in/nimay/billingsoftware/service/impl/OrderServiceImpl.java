package in.nimay.billingsoftware.service.impl;

import in.nimay.billingsoftware.entity.ItemEntity;
import in.nimay.billingsoftware.entity.OrderEntity;
import in.nimay.billingsoftware.entity.OrderItemEntity;
import in.nimay.billingsoftware.entity.UserEntity;
import in.nimay.billingsoftware.io.*;
import in.nimay.billingsoftware.repository.ItemRepository;
import in.nimay.billingsoftware.repository.OrderEntityRepository;
import in.nimay.billingsoftware.repository.UserRepository;
import in.nimay.billingsoftware.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class OrderServiceImpl implements OrderService {

    private static final BigDecimal FREE_DELIVERY_THRESHOLD = new BigDecimal("1999");
    private static final BigDecimal STANDARD_DELIVERY_FEE = new BigDecimal("99");

    private final OrderEntityRepository orderEntityRepository;
    private final UserRepository userRepository;
    private final ItemRepository itemRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Value("${razorpay.key.id:}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret:}")
    private String razorpayKeySecret;

    @Value("${razorpay.webhook.secret:}")
    private String razorpayWebhookSecret;

    private record ValidatedCart(
            List<OrderItemEntity> orderItems,
            Map<String, Integer> qtyByItemId,
            Map<String, ItemEntity> itemEntities,
            BigDecimal subtotal,
            BigDecimal deliveryFee,
            BigDecimal grandTotal
    ) {}

    private ValidatedCart validateAndPriceCart(OrderRequest request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Order request cannot be null.");
        }
        if (request.getCustomerName() == null || request.getCustomerName().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Customer name is required.");
        }
        if (request.getPhoneNumber() == null || request.getPhoneNumber().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mobile number is required.");
        }
        if (request.getCartItems() == null || request.getCartItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cart must contain at least one item.");
        }

        Map<String, Integer> qtyByItemId = new LinkedHashMap<>();
        Map<String, ItemEntity> itemEntities = new LinkedHashMap<>();
        List<OrderItemEntity> orderItems = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;

        for (OrderItemRequest reqItem : request.getCartItems()) {
            if (reqItem.getItemId() == null || reqItem.getItemId().isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid item in cart.");
            }
            ItemEntity dbItem = itemEntities.computeIfAbsent(reqItem.getItemId(), id ->
                    itemRepository.findByItemId(id)
                            .orElseThrow(() -> new ResponseStatusException(
                                    HttpStatus.BAD_REQUEST,
                                    "Item no longer exists in catalog: " + (reqItem.getName() != null ? reqItem.getName() : id)
                            ))
            );

            int qty = (reqItem.getQuantity() != null && reqItem.getQuantity() > 0) ? reqItem.getQuantity() : 1;
            int totalRequestedForItem = qtyByItemId.getOrDefault(dbItem.getItemId(), 0) + qty;
            qtyByItemId.put(dbItem.getItemId(), totalRequestedForItem);

            int availableStock = dbItem.getStock() != null ? dbItem.getStock() : 0;
            if (availableStock <= 0) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Sorry, the " + dbItem.getName() + " just sold out. Remove it to continue."
                );
            }
            if (totalRequestedForItem > availableStock) {
                throw new ResponseStatusException(
                        HttpStatus.CONFLICT,
                        "Only " + availableStock + " available for " + dbItem.getName() + "."
                );
            }

            BigDecimal realPrice = dbItem.getPrice() != null ? dbItem.getPrice() : BigDecimal.ZERO;
            subtotal = subtotal.add(realPrice.multiply(BigDecimal.valueOf(qty)));

            orderItems.add(OrderItemEntity.builder()
                    .itemId(dbItem.getItemId())
                    .name(dbItem.getName())
                    .size(reqItem.getSize() != null && !reqItem.getSize().isBlank() ? reqItem.getSize() : "M")
                    .color(reqItem.getColor() != null && !reqItem.getColor().isBlank() ? reqItem.getColor() : dbItem.getColor())
                    .imgUrl(dbItem.getImgUrl())
                    .price(realPrice)
                    .quantity(qty)
                    .build());
        }

        BigDecimal deliveryFee = subtotal.compareTo(FREE_DELIVERY_THRESHOLD) >= 0
                ? BigDecimal.ZERO
                : STANDARD_DELIVERY_FEE;
        BigDecimal grandTotal = subtotal.add(deliveryFee);

        return new ValidatedCart(orderItems, qtyByItemId, itemEntities, subtotal, deliveryFee, grandTotal);
    }

    private void deductStockOnce(OrderEntity order) {
        if (Boolean.TRUE.equals(order.getStockDeducted()) || order.getItems() == null) {
            return;
        }
        Map<String, Integer> qtyByItemId = new LinkedHashMap<>();
        for (OrderItemEntity item : order.getItems()) {
            qtyByItemId.merge(item.getItemId(), item.getQuantity() != null ? item.getQuantity() : 1, Integer::sum);
        }
        for (Map.Entry<String, Integer> entry : qtyByItemId.entrySet()) {
            ItemEntity dbItem = itemRepository.findByItemId(entry.getKey()).orElse(null);
            if (dbItem != null && dbItem.getStock() != null) {
                int remaining = Math.max(0, dbItem.getStock() - entry.getValue());
                dbItem.setStock(remaining);
                itemRepository.save(dbItem);
            }
        }
        order.setStockDeducted(true);
    }

    private String defaultEstimatedDelivery(String requested) {
        if (requested != null && !requested.isBlank()) {
            return requested.trim();
        }
        return LocalDate.now().plusDays(5).format(DateTimeFormatter.ofPattern("EEE, d MMM", Locale.ENGLISH));
    }

    private String generateOrderNumber() {
        return "#BB-" + (10000 + ThreadLocalRandom.current().nextInt(90000));
    }

    @Override
    @Transactional
    public OrderResponse createOrder(OrderRequest request, String authenticatedIdentifier) {
        if (request != null && request.getIdempotencyKey() != null && !request.getIdempotencyKey().isBlank()) {
            Optional<OrderEntity> existing = orderEntityRepository.findByIdempotencyKey(request.getIdempotencyKey().trim());
            if (existing.isPresent()) {
                return convertToResponse(existing.get());
            }
        }

        ValidatedCart validated = validateAndPriceCart(request);

        String paymentMethod = (request.getPaymentMethod() != null && !request.getPaymentMethod().trim().isEmpty())
                ? request.getPaymentMethod().trim().toUpperCase()
                : "COD";

        String orderId = UUID.randomUUID().toString();
        OrderEntity orderEntity = OrderEntity.builder()
                .orderId(orderId)
                .orderNumber(generateOrderNumber())
                .customerName(request.getCustomerName().trim())
                .phoneNumber(request.getPhoneNumber().trim())
                .userEmail(authenticatedIdentifier)
                .addressLine(request.getAddressLine())
                .pincode(request.getPincode())
                .city(request.getCity())
                .state(request.getState())
                .addressLabel(request.getAddressLabel())
                .estimatedDelivery(defaultEstimatedDelivery(request.getEstimatedDelivery()))
                .subtotal(validated.subtotal())
                .deliveryFee(validated.deliveryFee())
                .tax(BigDecimal.ZERO)
                .grandTotal(validated.grandTotal())
                .paymentMethod(paymentMethod)
                .paymentStatus("CASH".equals(paymentMethod) || "COD".equals(paymentMethod) ? "PENDING" : "PAID")
                .orderStatus("CONFIRMED")
                .paymentChannel("CASH".equals(paymentMethod) || "COD".equals(paymentMethod) ? "Pay on delivery" : paymentMethod)
                .idempotencyKey(request.getIdempotencyKey() != null && !request.getIdempotencyKey().isBlank()
                        ? request.getIdempotencyKey().trim() : null)
                .stockDeducted(false)
                .createdAt(LocalDateTime.now())
                .items(new ArrayList<>())
                .build();

        for (OrderItemEntity item : validated.orderItems()) {
            item.setOrder(orderEntity);
            orderEntity.getItems().add(item);
        }

        deductStockOnce(orderEntity);
        OrderEntity savedOrder = orderEntityRepository.save(orderEntity);
        return convertToResponse(savedOrder);
    }

    @Override
    @Transactional
    public RazorpayOrderResponse createRazorpayOrder(OrderRequest request, String authenticatedIdentifier) {
        if (razorpayKeyId == null || razorpayKeyId.isBlank() || razorpayKeySecret == null || razorpayKeySecret.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Razorpay is not configured on the server yet. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET or use Cash on delivery."
            );
        }

        if (request != null && request.getIdempotencyKey() != null && !request.getIdempotencyKey().isBlank()) {
            Optional<OrderEntity> existing = orderEntityRepository.findByIdempotencyKey(request.getIdempotencyKey().trim());
            if (existing.isPresent() && existing.get().getRazorpayOrderId() != null) {
                OrderEntity o = existing.get();
                return RazorpayOrderResponse.builder()
                        .orderId(o.getOrderId())
                        .orderNumber(o.getOrderNumber())
                        .razorpayOrderId(o.getRazorpayOrderId())
                        .amountPaise(o.getGrandTotal().multiply(BigDecimal.valueOf(100)).longValue())
                        .currency("INR")
                        .razorpayKeyId(razorpayKeyId)
                        .subtotal(o.getSubtotal())
                        .deliveryFee(o.getDeliveryFee())
                        .grandTotal(o.getGrandTotal())
                        .estimatedDelivery(o.getEstimatedDelivery())
                        .customerName(o.getCustomerName())
                        .phoneNumber(o.getPhoneNumber())
                        .userEmail(o.getUserEmail())
                        .build();
            }
        }

        ValidatedCart validated = validateAndPriceCart(request);
        long amountPaise = validated.grandTotal().multiply(BigDecimal.valueOf(100)).longValue();

        String orderId = UUID.randomUUID().toString();
        String orderNumber = generateOrderNumber();
        String estimatedDelivery = defaultEstimatedDelivery(request.getEstimatedDelivery());

        String razorpayOrderId;
        try {
            String auth = Base64.getEncoder().encodeToString((razorpayKeyId + ":" + razorpayKeySecret).getBytes(StandardCharsets.UTF_8));
            Map<String, Object> payloadMap = Map.of(
                    "amount", amountPaise,
                    "currency", "INR",
                    "receipt", orderNumber
            );
            String payloadJson = objectMapper.writeValueAsString(payloadMap);

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create("https://api.razorpay.com/v1/orders"))
                    .header("Authorization", "Basic " + auth)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(payloadJson))
                    .build();

            HttpResponse<String> response = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Unable to initiate Razorpay order. Please try again.");
            }
            JsonNode json = objectMapper.readTree(response.body());
            razorpayOrderId = json.get("id").asText();
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Failed to connect to Razorpay: " + e.getMessage());
        }

        OrderEntity orderEntity = OrderEntity.builder()
                .orderId(orderId)
                .orderNumber(orderNumber)
                .customerName(request.getCustomerName().trim())
                .phoneNumber(request.getPhoneNumber().trim())
                .userEmail(authenticatedIdentifier)
                .addressLine(request.getAddressLine())
                .pincode(request.getPincode())
                .city(request.getCity())
                .state(request.getState())
                .addressLabel(request.getAddressLabel())
                .estimatedDelivery(estimatedDelivery)
                .subtotal(validated.subtotal())
                .deliveryFee(validated.deliveryFee())
                .tax(BigDecimal.ZERO)
                .grandTotal(validated.grandTotal())
                .paymentMethod("RAZORPAY")
                .paymentStatus("PENDING")
                .orderStatus("PENDING")
                .razorpayOrderId(razorpayOrderId)
                .idempotencyKey(request.getIdempotencyKey() != null && !request.getIdempotencyKey().isBlank()
                        ? request.getIdempotencyKey().trim() : null)
                .stockDeducted(false)
                .createdAt(LocalDateTime.now())
                .items(new ArrayList<>())
                .build();

        for (OrderItemEntity item : validated.orderItems()) {
            item.setOrder(orderEntity);
            orderEntity.getItems().add(item);
        }

        orderEntityRepository.save(orderEntity);

        return RazorpayOrderResponse.builder()
                .orderId(orderId)
                .orderNumber(orderNumber)
                .razorpayOrderId(razorpayOrderId)
                .amountPaise(amountPaise)
                .currency("INR")
                .razorpayKeyId(razorpayKeyId)
                .subtotal(validated.subtotal())
                .deliveryFee(validated.deliveryFee())
                .grandTotal(validated.grandTotal())
                .estimatedDelivery(estimatedDelivery)
                .customerName(orderEntity.getCustomerName())
                .phoneNumber(orderEntity.getPhoneNumber())
                .userEmail(authenticatedIdentifier)
                .build();
    }

    @Override
    @Transactional
    public OrderResponse verifyRazorpayPayment(RazorpayVerifyRequest request) {
        if (request == null || request.getRazorpayOrderId() == null || request.getRazorpayPaymentId() == null || request.getRazorpaySignature() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing Razorpay payment verification fields.");
        }

        OrderEntity order = orderEntityRepository.findByRazorpayOrderId(request.getRazorpayOrderId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found for Razorpay order ID."));

        String expectedSignature = hmacSha256Hex(
                request.getRazorpayOrderId() + "|" + request.getRazorpayPaymentId(),
                razorpayKeySecret
        );

        if (!constantTimeEquals(expectedSignature, request.getRazorpaySignature())) {
            order.setPaymentStatus("FAILED");
            orderEntityRepository.save(order);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Payment signature verification failed.");
        }

        order.setRazorpayPaymentId(request.getRazorpayPaymentId());
        order.setRazorpaySignature(request.getRazorpaySignature());
        order.setPaymentStatus("PAID");
        order.setOrderStatus("CONFIRMED");
        order.setPaymentChannel(request.getPaymentChannel() != null && !request.getPaymentChannel().isBlank()
                ? request.getPaymentChannel() : "Razorpay");
        deductStockOnce(order);

        return convertToResponse(orderEntityRepository.save(order));
    }

    @Override
    @Transactional
    public void handleRazorpayWebhook(String rawBody, String signatureHeader) {
        String secret = (razorpayWebhookSecret != null && !razorpayWebhookSecret.isBlank())
                ? razorpayWebhookSecret
                : razorpayKeySecret;
        if (secret == null || secret.isBlank() || signatureHeader == null || signatureHeader.isBlank()) {
            return;
        }
        String expected = hmacSha256Hex(rawBody, secret);
        if (!constantTimeEquals(expected, signatureHeader)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid webhook signature.");
        }
        try {
            JsonNode root = objectMapper.readTree(rawBody);
            String event = root.path("event").asText("");
            if ("payment.captured".equals(event) || "order.paid".equals(event)) {
                JsonNode paymentEntity = root.path("payload").path("payment").path("entity");
                String rzpOrderId = paymentEntity.path("order_id").asText("");
                String rzpPaymentId = paymentEntity.path("id").asText("");
                String method = paymentEntity.path("method").asText("Razorpay");
                if (!rzpOrderId.isBlank()) {
                    orderEntityRepository.findByRazorpayOrderId(rzpOrderId).ifPresent(order -> {
                        order.setPaymentStatus("PAID");
                        order.setOrderStatus("CONFIRMED");
                        if (!rzpPaymentId.isBlank()) order.setRazorpayPaymentId(rzpPaymentId);
                        order.setPaymentChannel(method.toUpperCase());
                        deductStockOnce(order);
                        orderEntityRepository.save(order);
                    });
                }
            }
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception ignored) {
        }
    }

    @Override
    @Transactional
    public OrderResponse updateOrderStatus(String orderId, String orderStatus, String paymentStatus) {
        OrderEntity order = orderEntityRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Order not found: " + orderId));
        if (orderStatus != null && !orderStatus.isBlank()) {
            order.setOrderStatus(orderStatus.trim().toUpperCase());
        }
        if (paymentStatus != null && !paymentStatus.isBlank()) {
            order.setPaymentStatus(paymentStatus.trim().toUpperCase());
        }
        return convertToResponse(orderEntityRepository.save(order));
    }

    private String hmacSha256Hex(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] raw = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(raw.length * 2);
            for (byte b : raw) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            throw new IllegalStateException("Unable to compute HMAC-SHA256", e);
        }
    }

    private boolean constantTimeEquals(String a, String b) {
        if (a == null || b == null || a.length() != b.length()) return false;
        int result = 0;
        for (int i = 0; i < a.length(); i++) {
            result |= a.charAt(i) ^ b.charAt(i);
        }
        return result == 0;
    }

    @Override
    public List<OrderResponse> getOrders() {
        return orderEntityRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::convertToResponse)
                .toList();
    }

    @Override
    public List<OrderResponse> getOrdersForUser(String authenticatedIdentifier) {
        if (authenticatedIdentifier == null || authenticatedIdentifier.isBlank()) {
            return List.of();
        }
        UserEntity user = userRepository.findByEmailOrPhoneNumber(authenticatedIdentifier).orElse(null);
        List<OrderEntity> matches;
        if (user != null && user.getPhoneNumber() != null && !user.getPhoneNumber().isBlank()) {
            String emailKey = user.getEmail() != null ? user.getEmail() : authenticatedIdentifier;
            matches = orderEntityRepository.findByUserEmailOrPhoneNumberOrderByCreatedAtDesc(emailKey, user.getPhoneNumber());
        } else {
            matches = orderEntityRepository.findByUserEmailOrderByCreatedAtDesc(authenticatedIdentifier);
        }
        return matches.stream().map(this::convertToResponse).toList();
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
                        .size(item.getSize())
                        .color(item.getColor())
                        .imgUrl(item.getImgUrl())
                        .price(item.getPrice())
                        .quantity(item.getQuantity())
                        .build())
                .toList()
                : List.of();

        PaymentDetails paymentDetails = PaymentDetails.builder()
                .paymentMethod(entity.getPaymentMethod())
                .status(entity.getPaymentStatus() != null ? entity.getPaymentStatus() : "COMPLETED")
                .transactionId(entity.getRazorpayPaymentId() != null
                        ? entity.getRazorpayPaymentId()
                        : "TXN-" + entity.getOrderId().substring(0, 8).toUpperCase())
                .razorpayOrderId(entity.getRazorpayOrderId())
                .razorpayPaymentId(entity.getRazorpayPaymentId())
                .paymentChannel(entity.getPaymentChannel())
                .build();

        return OrderResponse.builder()
                .orderId(entity.getOrderId())
                .orderNumber(entity.getOrderNumber() != null
                        ? entity.getOrderNumber()
                        : "#BB-" + entity.getOrderId().substring(0, 5).toUpperCase())
                .customerName(entity.getCustomerName())
                .phoneNumber(entity.getPhoneNumber())
                .addressLine(entity.getAddressLine())
                .pincode(entity.getPincode())
                .city(entity.getCity())
                .state(entity.getState())
                .addressLabel(entity.getAddressLabel())
                .estimatedDelivery(entity.getEstimatedDelivery())
                .cartItems(itemResponses)
                .subtotal(entity.getSubtotal())
                .deliveryFee(entity.getDeliveryFee() != null ? entity.getDeliveryFee() : BigDecimal.ZERO)
                .tax(entity.getTax() != null ? entity.getTax() : BigDecimal.ZERO)
                .grandTotal(entity.getGrandTotal())
                .paymentMethod(entity.getPaymentMethod())
                .paymentStatus(entity.getPaymentStatus() != null ? entity.getPaymentStatus() : "COMPLETED")
                .orderStatus(entity.getOrderStatus() != null ? entity.getOrderStatus() : "CONFIRMED")
                .paymentChannel(entity.getPaymentChannel())
                .createdAt(entity.getCreatedAt())
                .paymentDetails(paymentDetails)
                .build();
    }
}
