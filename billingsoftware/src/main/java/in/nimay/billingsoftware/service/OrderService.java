package in.nimay.billingsoftware.service;

import in.nimay.billingsoftware.io.OrderRequest;
import in.nimay.billingsoftware.io.OrderResponse;

import java.util.List;

public interface OrderService {

    OrderResponse createOrder(OrderRequest request);

    List<OrderResponse> getOrders();

    OrderResponse getOrderByOrderId(String orderId);

}
