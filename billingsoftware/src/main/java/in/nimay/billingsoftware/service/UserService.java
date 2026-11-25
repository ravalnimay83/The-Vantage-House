package in.nimay.billingsoftware.service;

import in.nimay.billingsoftware.entity.UserEntity;
import in.nimay.billingsoftware.io.UserRequest;
import in.nimay.billingsoftware.io.UserResponse;

import java.util.List;
import java.util.Optional;

public interface UserService {
    UserResponse createUser(UserRequest userRequest);

    String getUserRole(String identifier);

    UserResponse getProfile(String identifier);

    UserResponse updateProfile(String identifier, UserRequest request);

    boolean existsByIdentifier(String identifier);

    Optional<UserEntity> findExistingGoogleUser(String googleId, String email);

    UserEntity findOrCreateGoogleUser(String googleId, String email, String name, String avatarUrl);

    UserResponse completeGoogleSignupWithSpareKey(String googleId, String email, String name, String avatarUrl, String password, String confirmPassword);

    UserResponse setSpareKey(String identifier, String password, String confirmPassword);

    List<UserResponse> readUsers();

    void deleteUser(String id);
}
