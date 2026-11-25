package in.nimay.billingsoftware.service;

import in.nimay.billingsoftware.io.OrderRequest;
import in.nimay.billingsoftware.io.OrderResponse;
import in.nimay.billingsoftware.io.RazorpayOrderResponse;
import in.nimay.billingsoftware.io.RazorpayVerifyRequest;

import java.util.List;

public interface OrderService {

    OrderResponse createOrder(OrderRequest request, String authenticatedIdentifier);

    RazorpayOrderResponse createRazorpayOrder(OrderRequest request, String authenticatedIdentifier);

    OrderResponse verifyRazorpayPayment(RazorpayVerifyRequest request);

    void handleRazorpayWebhook(String rawBody, String signatureHeader);

    OrderResponse updateOrderStatus(String orderId, String orderStatus, String paymentStatus);

    List<OrderResponse> getOrders();

    List<OrderResponse> getOrdersForUser(String authenticatedIdentifier);

    OrderResponse getOrderByOrderId(String orderId);

}
