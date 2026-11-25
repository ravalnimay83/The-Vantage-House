package in.nimay.billingsoftware.repository;

import in.nimay.billingsoftware.entity.PasswordResetTokenEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetTokenEntity, Long> {

    Optional<PasswordResetTokenEntity> findTopByEmailAndUsedFalseOrderByCreatedAtDesc(String email);

    List<PasswordResetTokenEntity> findByEmailAndUsedFalse(String email);

}
