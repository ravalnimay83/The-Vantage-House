package in.nimay.billingsoftware.controller;

import in.nimay.billingsoftware.io.OrderRequest;
import in.nimay.billingsoftware.io.OrderResponse;
import in.nimay.billingsoftware.io.RazorpayOrderResponse;
import in.nimay.billingsoftware.io.RazorpayVerifyRequest;
import in.nimay.billingsoftware.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/orders", "/admin/orders"})
@RequiredArgsConstructor
@CrossOrigin("*")
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse createOrder(@RequestBody OrderRequest request, Authentication authentication) {
        String userIdentifier = (authentication != null && authentication.isAuthenticated())
                ? authentication.getName()
                : null;
        return orderService.createOrder(request, userIdentifier);
    }

    @PostMapping("/razorpay/create")
    @ResponseStatus(HttpStatus.CREATED)
    public RazorpayOrderResponse createRazorpayOrder(@RequestBody OrderRequest request, Authentication authentication) {
        String userIdentifier = (authentication != null && authentication.isAuthenticated())
                ? authentication.getName()
                : null;
        return orderService.createRazorpayOrder(request, userIdentifier);
    }

    @PostMapping("/razorpay/verify")
    public OrderResponse verifyRazorpayPayment(@RequestBody RazorpayVerifyRequest request) {
        return orderService.verifyRazorpayPayment(request);
    }

    @PostMapping("/razorpay/webhook")
    public Map<String, String> razorpayWebhook(
            @RequestBody String rawBody,
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature) {
        orderService.handleRazorpayWebhook(rawBody, signature);
        return Map.of("status", "ok");
    }

    @PatchMapping("/{orderId}/status")
    public OrderResponse updateOrderStatus(@PathVariable String orderId, @RequestBody Map<String, String> body) {
        return orderService.updateOrderStatus(orderId, body.get("orderStatus"), body.get("paymentStatus"));
    }

    @GetMapping
    public List<OrderResponse> getOrders() {
        return orderService.getOrders();
    }

    @GetMapping("/my-orders")
    public List<OrderResponse> getMyOrders(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return List.of();
        }
        return orderService.getOrdersForUser(authentication.getName());
    }

    @GetMapping("/{orderId}")
    public OrderResponse getOrderById(@PathVariable String orderId) {
        return orderService.getOrderByOrderId(orderId);
    }
}
