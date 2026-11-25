package in.nimay.billingsoftware.service.impl;

import in.nimay.billingsoftware.entity.UserEntity;
import in.nimay.billingsoftware.io.UserRequest;
import in.nimay.billingsoftware.io.UserResponse;
import in.nimay.billingsoftware.repository.UserRepository;
import in.nimay.billingsoftware.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public UserResponse createUser(UserRequest userRequest) {
        String cleanEmail = normalizeOptional(userRequest.getEmail());
        String cleanPhone = normalizeOptional(userRequest.getPhoneNumber());

        if (cleanEmail == null && cleanPhone == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Either email or phone number is required.");
        }

        if (cleanEmail != null && userRepository.findByEmail(cleanEmail).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account already exists with email: " + cleanEmail);
        }

        if (cleanPhone != null && userRepository.findByPhoneNumber(cleanPhone).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "An account already exists with phone number: " + cleanPhone);
        }

        UserEntity newUser = convertToEntity(userRequest, cleanEmail, cleanPhone);
        newUser = userRepository.save(newUser);
        return convertToResponse(newUser);
    }

    @Override
    public String getUserRole(String identifier) {
        return userRepository.findByEmailOrPhoneNumber(identifier)
                .map(UserEntity::getRole)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + identifier));
    }

    @Override
    public UserResponse getProfile(String identifier) {
        UserEntity user = userRepository.findByEmailOrPhoneNumber(identifier)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User profile not found."));
        return convertToResponse(user);
    }

    @Override
    public UserResponse updateProfile(String identifier, UserRequest request) {
        UserEntity user = userRepository.findByEmailOrPhoneNumber(identifier)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User profile not found."));
        final Long currentUserId = user.getId();

        if (request.getName() != null && !request.getName().isBlank()) {
            user.setName(request.getName().trim());
        }

        String newEmail = normalizeOptional(request.getEmail());
        if (newEmail != null && !newEmail.equalsIgnoreCase(user.getEmail())) {
            userRepository.findByEmail(newEmail).ifPresent(existing -> {
                if (!existing.getId().equals(currentUserId)) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already in use.");
                }
            });
            user.setEmail(newEmail);
        }

        String newPhone = normalizeOptional(request.getPhoneNumber());
        if (newPhone != null && !newPhone.equals(user.getPhoneNumber())) {
            userRepository.findByPhoneNumber(newPhone).ifPresent(existing -> {
                if (!existing.getId().equals(currentUserId)) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Phone number is already in use.");
                }
            });
            user.setPhoneNumber(newPhone);
        } else if (request.getPhoneNumber() != null && request.getPhoneNumber().isBlank() && user.getEmail() != null) {
            user.setPhoneNumber(null);
        }

        user = userRepository.save(user);
        return convertToResponse(user);
    }

    @Override
    public boolean existsByIdentifier(String identifier) {
        return userRepository.findByEmailOrPhoneNumber(identifier).isPresent();
    }

    @Override
    public Optional<UserEntity> findExistingGoogleUser(String googleId, String email) {
        UserEntity user = null;
        if (googleId != null && !googleId.isBlank()) {
            user = userRepository.findByGoogleId(googleId).orElse(null);
        }
        if (user == null && email != null && !email.isBlank()) {
            user = userRepository.findByEmail(email.trim()).orElse(null);
        }
        return Optional.ofNullable(user);
    }

    @Override
    public UserEntity findOrCreateGoogleUser(String googleId, String email, String name, String avatarUrl) {
        UserEntity user = findExistingGoogleUser(googleId, email).orElse(null);

        if (user != null) {
            boolean dirty = false;
            if (googleId != null && (user.getGoogleId() == null || user.getGoogleId().isBlank())) {
                user.setGoogleId(googleId);
                dirty = true;
            }
            if (avatarUrl != null && !avatarUrl.isBlank() && !avatarUrl.equals(user.getAvatarUrl())) {
                user.setAvatarUrl(avatarUrl);
                dirty = true;
            }
            if (user.getProvider() == null) {
                user.setProvider("GOOGLE");
                dirty = true;
            }
            return dirty ? userRepository.save(user) : user;
        }

        UserEntity newUser = UserEntity.builder()
                .userId(UUID.randomUUID().toString())
                .name(name != null && !name.isBlank() ? name.trim() : "Google User")
                .email(normalizeOptional(email))
                .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                .role("ravalnimay83@gmail.com".equalsIgnoreCase(email) ? "ROLE_ADMIN" : "ROLE_USER")
                .provider("GOOGLE")
                .googleId(googleId)
                .avatarUrl(avatarUrl)
                .passwordSet(false)
                .xp(0)
                .build();

        return userRepository.save(newUser);
    }

    private void validateSpareKeyPassword(String password, String confirmPassword) {
        if (password == null || password.length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A little longer and it's a good key. Password must be at least 8 characters.");
        }
        if (!password.matches(".*\\d.*")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must contain at least one number.");
        }
        if (!password.matches(".*[A-Z].*")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must contain at least one uppercase letter.");
        }
        if (!password.equals(confirmPassword)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "These two don't match yet.");
        }
    }

    @Override
    public UserResponse completeGoogleSignupWithSpareKey(String googleId, String email, String name, String avatarUrl, String password, String confirmPassword) {
        validateSpareKeyPassword(password, confirmPassword);
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Verified Google email is required.");
        }

        UserEntity existing = findExistingGoogleUser(googleId, email).orElse(null);
        if (existing != null) {
            boolean wasAlreadySet = Boolean.TRUE.equals(existing.getPasswordSet());
            existing.setPassword(passwordEncoder.encode(password));
            existing.setPasswordSet(true);
            if (!wasAlreadySet) {
                int currentXp = existing.getXp() != null ? existing.getXp() : 0;
                existing.setXp(currentXp + 50);
            }
            return convertToResponse(userRepository.save(existing));
        }

        String normalizedEmail = normalizeOptional(email);
        UserEntity newUser = UserEntity.builder()
                .userId(UUID.randomUUID().toString())
                .name(name != null && !name.isBlank() ? name.trim() : "Google User")
                .email(normalizedEmail)
                .password(passwordEncoder.encode(password))
                .role("ravalnimay83@gmail.com".equalsIgnoreCase(normalizedEmail) ? "ROLE_ADMIN" : "ROLE_USER")
                .provider("GOOGLE")
                .googleId(googleId)
                .avatarUrl(avatarUrl)
                .passwordSet(true)
                .xp(50)
                .build();

        return convertToResponse(userRepository.save(newUser));
    }

    @Override
    public UserResponse setSpareKey(String identifier, String password, String confirmPassword) {
        validateSpareKeyPassword(password, confirmPassword);

        UserEntity user = userRepository.findByEmailOrPhoneNumber(identifier)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User account not found."));

        boolean wasAlreadySet = Boolean.TRUE.equals(user.getPasswordSet());
        user.setPassword(passwordEncoder.encode(password));
        user.setPasswordSet(true);
        if (!wasAlreadySet) {
            int currentXp = user.getXp() != null ? user.getXp() : 0;
            user.setXp(currentXp + 50);
        }

        user = userRepository.save(user);
        return convertToResponse(user);
    }

    @Override
    public List<UserResponse> readUsers() {
        return userRepository.findAll()
                .stream()
                .map(this::convertToResponse)
                .toList();
    }

    @Override
    public void deleteUser(String id) {
        UserEntity user = userRepository.findByUserId(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found: " + id));
        if ("ravalnimay83@gmail.com".equalsIgnoreCase(user.getEmail())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "The primary admin account cannot be deleted.");
        }
        userRepository.delete(user);
    }

    private String normalizeOptional(String val) {
        return (val != null && !val.trim().isEmpty()) ? val.trim() : null;
    }

    private UserEntity convertToEntity(UserRequest request, String cleanEmail, String cleanPhone) {
        // Only ravalnimay83@gmail.com can hold ROLE_ADMIN; everyone else is ROLE_USER
        String role = "ravalnimay83@gmail.com".equalsIgnoreCase(cleanEmail)
                ? "ROLE_ADMIN"
                : "ROLE_USER";

        return UserEntity.builder()
                .userId(UUID.randomUUID().toString())
                .name(request.getName() != null ? request.getName().trim() : "User")
                .email(cleanEmail)
                .phoneNumber(cleanPhone)
                .password(passwordEncoder.encode(request.getPassword()))
                .role(role)
                .provider("LOCAL")
                .avatarUrl(request.getAvatarUrl())
                .passwordSet(true)
                .xp(100)
                .build();
    }

    private UserResponse convertToResponse(UserEntity user) {
        boolean isPasswordSet = user.getPasswordSet() != null
                ? user.getPasswordSet()
                : !"GOOGLE".equalsIgnoreCase(user.getProvider());
        return UserResponse.builder()
                .userId(user.getUserId())
                .name(user.getName())
                .email(user.getEmail())
                .phoneNumber(user.getPhoneNumber())
                .role(user.getRole())
                .provider(user.getProvider() != null ? user.getProvider() : "LOCAL")
                .avatarUrl(user.getAvatarUrl())
                .passwordSet(isPasswordSet)
                .xp(user.getXp() != null ? user.getXp() : 0)
                .createdAt(user.getCreatedAt())
                .updatedAt(user.getUpdatedAt())
                .build();
    }
}
