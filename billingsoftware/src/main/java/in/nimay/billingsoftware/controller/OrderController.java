package in.nimay.billingsoftware.controller;

import in.nimay.billingsoftware.io.OrderRequest;
import in.nimay.billingsoftware.io.OrderResponse;
import in.nimay.billingsoftware.service.OrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/orders", "/admin/orders"})
@RequiredArgsConstructor
@CrossOrigin("*")
public class OrderController {

    private final OrderService orderService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse createOrder(@RequestBody OrderRequest request) {
        return orderService.createOrder(request);
    }

    @GetMapping
    public List<OrderResponse> getOrders() {
        return orderService.getOrders();
    }

    @GetMapping("/{orderId}")
    public OrderResponse getOrderById(@PathVariable String orderId) {
        return orderService.getOrderByOrderId(orderId);
    }

}
