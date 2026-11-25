package in.nimay.billingsoftware.repository;

import in.nimay.billingsoftware.entity.OrderItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OrderItemEntityRepository extends JpaRepository<OrderItemEntity, Long> {
    List<OrderItemEntity> findByOrder_OrderId(String orderId);
}
