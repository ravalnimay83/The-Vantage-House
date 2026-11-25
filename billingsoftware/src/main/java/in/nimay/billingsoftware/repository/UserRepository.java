package in.nimay.billingsoftware.repository;

import in.nimay.billingsoftware.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository extends JpaRepository<UserEntity, Long> {

    Optional<UserEntity> findByEmail(String email);

    Optional<UserEntity> findByPhoneNumber(String phoneNumber);

    Optional<UserEntity> findByUserId(String userId);

    Optional<UserEntity> findByGoogleId(String googleId);

    default Optional<UserEntity> findByEmailOrPhoneNumber(String identifier) {
        if (identifier == null || identifier.isBlank()) {
            return Optional.empty();
        }
        String trimmed = identifier.trim();
        Optional<UserEntity> direct = findByEmail(trimmed).or(() -> findByPhoneNumber(trimmed));
        if (direct.isPresent()) {
            return direct;
        }
        // Fallback: if stored without country code or with +91, check stripped 10-digit suffix
        String digits = trimmed.replaceAll("[^0-9]", "");
        if (digits.length() > 10) {
            String last10 = digits.substring(digits.length() - 10);
            return findByPhoneNumber(last10).or(() -> findByPhoneNumber("+91" + last10));
        } else if (digits.length() == 10) {
            return findByPhoneNumber("+91" + digits);
        }
        return Optional.empty();
    }
}
