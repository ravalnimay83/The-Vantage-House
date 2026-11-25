package in.nimay.billingsoftware.repository;

import in.nimay.billingsoftware.entity.CartItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface CartItemRepository extends JpaRepository<CartItemEntity, Long> {
    List<CartItemEntity> findByUserEmailOrderByIdAsc(String userEmail);
    void deleteByUserEmail(String userEmail);
}
