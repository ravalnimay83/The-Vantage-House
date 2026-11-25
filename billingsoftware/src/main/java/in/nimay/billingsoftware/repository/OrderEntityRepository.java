package in.nimay.billingsoftware.repository;

import in.nimay.billingsoftware.entity.OrderEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface OrderEntityRepository extends JpaRepository<OrderEntity, Long> {
    Optional<OrderEntity> findByOrderId(String orderId);
    Optional<OrderEntity> findByRazorpayOrderId(String razorpayOrderId);
    Optional<OrderEntity> findByIdempotencyKey(String idempotencyKey);
    List<OrderEntity> findAllByOrderByCreatedAtDesc();
    List<OrderEntity> findByUserEmailOrPhoneNumberOrderByCreatedAtDesc(String userEmail, String phoneNumber);
    List<OrderEntity> findByUserEmailOrderByCreatedAtDesc(String userEmail);
}
