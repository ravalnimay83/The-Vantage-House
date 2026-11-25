package in.nimay.billingsoftware.controller;

import in.nimay.billingsoftware.entity.UserEntity;
import in.nimay.billingsoftware.io.AuthRequest;
import in.nimay.billingsoftware.io.AuthResponse;
import in.nimay.billingsoftware.io.GoogleAuthRequest;
import in.nimay.billingsoftware.io.UserRequest;
import in.nimay.billingsoftware.io.UserResponse;
import in.nimay.billingsoftware.service.PasswordResetService;
import in.nimay.billingsoftware.service.UserService;
import in.nimay.billingsoftware.util.JwtUtil;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@CrossOrigin("*")
public class AuthController {

    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final UserService userService;
    private final PasswordResetService passwordResetService;
    private final JwtUtil jwtUtil;

    @Value("${google.client.id:}")
    private String googleClientId;

    @PostMapping("/auth/check-identifier")
    public Map<String, Object> checkIdentifier(@RequestBody Map<String, String> body) {
        String identifier = body.get("identifier");
        if (identifier == null || identifier.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email or mobile number is required.");
        }
        String clean = identifier.trim();
        boolean exists = userService.existsByIdentifier(clean);
        return Map.of("exists", exists, "identifier", clean);
    }

    @PostMapping({"/login", "/auth/login"})
    public AuthResponse login(@RequestBody AuthRequest request) {
        String identifier = request.resolvedIdentifier();
        if (identifier == null || identifier.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email or phone number is required.");
        }
        authenticate(identifier, request.getPassword());
        final UserDetails userDetails = userDetailsService.loadUserByUsername(identifier);
        final String jwtToken = jwtUtil.generateTokens(userDetails);
        final UserResponse profile = userService.getProfile(identifier);
        return AuthResponse.builder()
                .email(profile.getEmail())
                .token(jwtToken)
                .role(profile.getRole())
                .name(profile.getName())
                .userId(profile.getUserId())
                .phoneNumber(profile.getPhoneNumber())
                .provider(profile.getProvider())
                .avatarUrl(profile.getAvatarUrl())
                .passwordSet(profile.getPasswordSet())
                .xp(profile.getXp())
                .build();
    }

    @PostMapping({"/register", "/auth/register"})
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse register(@RequestBody UserRequest request) {
        if (request.getRole() == null || request.getRole().isBlank()) {
            request.setRole("ROLE_USER");
        }
        return userService.createUser(request);
    }

    @PostMapping("/auth/google")
    public AuthResponse googleLogin(@RequestBody GoogleAuthRequest request) {
        if (request == null || ((request.getCredential() == null || request.getCredential().isBlank())
                && (request.getAccessToken() == null || request.getAccessToken().isBlank()))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Google credential or access token is required.");
        }

        JsonNode googlePayload = verifyGoogleToken(request);
        String googleId = textOrNull(googlePayload, "sub");
        String email = textOrNull(googlePayload, "email");
        String name = textOrNull(googlePayload, "name");
        String avatarUrl = textOrNull(googlePayload, "picture");

        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unable to retrieve verified email from Google.");
        }

        UserEntity existingUser = userService.findExistingGoogleUser(googleId, email).orElse(null);
        if (existingUser != null) {
            UserEntity syncedUser = userService.findOrCreateGoogleUser(googleId, email, name, avatarUrl);
            UserDetails userDetails = userDetailsService.loadUserByUsername(syncedUser.getEmail());
            String jwtToken = jwtUtil.generateTokens(userDetails);
            boolean isPasswordSet = syncedUser.getPasswordSet() != null ? syncedUser.getPasswordSet() : false;

            return AuthResponse.builder()
                    .email(syncedUser.getEmail())
                    .token(jwtToken)
                    .role(syncedUser.getRole())
                    .name(syncedUser.getName())
                    .userId(syncedUser.getUserId())
                    .phoneNumber(syncedUser.getPhoneNumber())
                    .provider(syncedUser.getProvider())
                    .avatarUrl(syncedUser.getAvatarUrl())
                    .passwordSet(isPasswordSet)
                    .xp(syncedUser.getXp() != null ? syncedUser.getXp() : 0)
                    .build();
        }

        String displayName = (name != null && !name.isBlank()) ? name.trim() : "Google User";
        String pendingToken = jwtUtil.generateTokens(
                Map.of(
                        "pendingGoogle", true,
                        "googleId", googleId != null ? googleId : "",
                        "name", displayName,
                        "avatarUrl", avatarUrl != null ? avatarUrl : ""
                ),
                email.trim()
        );

        return AuthResponse.builder()
                .email(email.trim())
                .token(pendingToken)
                .role("ravalnimay83@gmail.com".equalsIgnoreCase(email.trim()) ? "ROLE_ADMIN" : "ROLE_USER")
                .name(displayName)
                .provider("GOOGLE")
                .avatarUrl(avatarUrl)
                .passwordSet(false)
                .xp(0)
                .build();
    }

    @PostMapping("/auth/set-spare-key")
    public AuthResponse setSpareKey(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            Authentication authentication,
            @RequestBody Map<String, String> body) {
        UserResponse updated = null;

        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            try {
                Claims claims = jwtUtil.extractAllClaims(authHeader.substring(7));
                if (Boolean.TRUE.equals(claims.get("pendingGoogle", Boolean.class))) {
                    updated = userService.completeGoogleSignupWithSpareKey(
                            claims.get("googleId", String.class),
                            claims.getSubject(),
                            claims.get("name", String.class),
                            claims.get("avatarUrl", String.class),
                            body.get("password"),
                            body.get("confirmPassword")
                    );
                }
            } catch (ResponseStatusException e) {
                throw e;
            } catch (Exception e) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Session expired. Please sign in with Google again.");
            }
        }

        if (updated == null) {
            if (authentication == null || !authentication.isAuthenticated()) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Please sign in first.");
            }
            updated = userService.setSpareKey(
                    authentication.getName(),
                    body.get("password"),
                    body.get("confirmPassword")
            );
        }

        UserDetails userDetails = userDetailsService.loadUserByUsername(updated.getEmail());
        String jwtToken = jwtUtil.generateTokens(userDetails);

        return AuthResponse.builder()
                .email(updated.getEmail())
                .token(jwtToken)
                .role(updated.getRole())
                .name(updated.getName())
                .userId(updated.getUserId())
                .phoneNumber(updated.getPhoneNumber())
                .provider(updated.getProvider())
                .avatarUrl(updated.getAvatarUrl())
                .passwordSet(updated.getPasswordSet())
                .xp(updated.getXp())
                .build();
    }

    @PostMapping("/auth/send-signup-otp")
    public Map<String, Object> sendSignupOtp(@RequestBody Map<String, String> body) {
        return passwordResetService.sendSignupOtp(body.get("email"), body.get("phoneNumber"));
    }

    @PostMapping("/auth/verify-signup-otp")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse verifySignupOtp(@RequestBody Map<String, String> body) {
        String name = body.get("name");
        String email = body.get("email");
        String phoneNumber = body.get("phoneNumber");
        String password = body.get("password");
        String code = body.get("code");

        if (password == null || password.length() < 8 || !password.matches(".*\\d.*") || !password.matches(".*[A-Z].*")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 8 characters with 1 number and 1 uppercase letter.");
        }

        passwordResetService.verifySignupOtp(email, code);

        UserRequest userReq = UserRequest.builder()
                .name(name)
                .email(email)
                .phoneNumber(phoneNumber)
                .password(password)
                .role("ROLE_USER")
                .build();
        UserResponse created = userService.createUser(userReq);

        String loginId = created.getEmail() != null ? created.getEmail() : created.getPhoneNumber();
        UserDetails userDetails = userDetailsService.loadUserByUsername(loginId);
        String jwtToken = jwtUtil.generateTokens(userDetails);

        return AuthResponse.builder()
                .email(created.getEmail())
                .token(jwtToken)
                .role(created.getRole())
                .name(created.getName())
                .userId(created.getUserId())
                .phoneNumber(created.getPhoneNumber())
                .provider(created.getProvider())
                .avatarUrl(created.getAvatarUrl())
                .passwordSet(true)
                .xp(created.getXp())
                .build();
    }

    @PostMapping("/auth/forgot-password")
    public Map<String, Object> forgotPassword(@RequestBody Map<String, String> body) {
        return passwordResetService.sendResetCode(body.get("email"));
    }

    @PostMapping("/auth/verify-reset-code")
    public Map<String, Object> verifyResetCode(@RequestBody Map<String, String> body) {
        passwordResetService.verifyResetCode(body.get("email"), body.get("code"));
        return Map.of("valid", true, "message", "Verification code confirmed.");
    }

    @PostMapping("/auth/reset-password")
    public AuthResponse resetPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String code = body.get("code");
        String newPassword = body.get("newPassword");
        String confirmPassword = body.get("confirmPassword");

        if (confirmPassword != null && !confirmPassword.equals(newPassword)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Passwords do not match.");
        }

        passwordResetService.resetPassword(email, code, newPassword);

        // Automatically sign in the user after resetting their password
        String cleanEmail = email.trim();
        UserDetails userDetails = userDetailsService.loadUserByUsername(cleanEmail);
        String jwtToken = jwtUtil.generateTokens(userDetails);
        UserResponse profile = userService.getProfile(cleanEmail);

        return AuthResponse.builder()
                .email(profile.getEmail())
                .token(jwtToken)
                .role(profile.getRole())
                .name(profile.getName())
                .userId(profile.getUserId())
                .phoneNumber(profile.getPhoneNumber())
                .provider(profile.getProvider())
                .avatarUrl(profile.getAvatarUrl())
                .passwordSet(profile.getPasswordSet())
                .xp(profile.getXp())
                .build();
    }

    @GetMapping({"/profile", "/auth/me"})
    public UserResponse getProfile(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated.");
        }
        return userService.getProfile(authentication.getName());
    }

    @PutMapping("/profile")
    public UserResponse updateProfile(Authentication authentication, @RequestBody UserRequest request) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated.");
        }
        return userService.updateProfile(authentication.getName(), request);
    }

    @PostMapping("/encode")
    public Map<String, String> encode(@RequestBody Map<String, String> body) {
        String encoded = passwordEncoder.encode(body.get("password"));
        return Map.of("encodedPassword", encoded);
    }

    private void authenticate(String identifier, String password) {
        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(identifier, password));
        } catch (DisabledException e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Account is disabled");
        } catch (BadCredentialsException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Incorrect email/phone or password");
        } catch (AuthenticationException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Authentication failed: " + e.getMessage());
        }
    }

    private JsonNode verifyGoogleToken(GoogleAuthRequest request) {
        try {
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest httpRequest;

            if (request.getCredential() != null && !request.getCredential().isBlank()) {
                String encoded = URLEncoder.encode(request.getCredential().trim(), StandardCharsets.UTF_8);
                httpRequest = HttpRequest.newBuilder()
                        .uri(URI.create("https://oauth2.googleapis.com/tokeninfo?id_token=" + encoded))
                        .GET()
                        .build();
            } else {
                httpRequest = HttpRequest.newBuilder()
                        .uri(URI.create("https://www.googleapis.com/oauth2/v3/userinfo"))
                        .header("Authorization", "Bearer " + request.getAccessToken().trim())
                        .GET()
                        .build();
            }

            HttpResponse<String> response = client.send(httpRequest, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Google token.");
            }

            ObjectMapper mapper = new ObjectMapper();
            JsonNode payload = mapper.readTree(response.body());

            if (request.getCredential() != null && !request.getCredential().isBlank()
                    && googleClientId != null && !googleClientId.isBlank()) {
                String aud = textOrNull(payload, "aud");
                if (!googleClientId.equals(aud)) {
                    throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Google token audience mismatch.");
                }
            }

            return payload;
        } catch (ResponseStatusException e) {
            throw e;
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Google token verification failed: " + e.getMessage());
        }
    }

    private String textOrNull(JsonNode node, String field) {
        return node != null && node.has(field) && !node.get(field).isNull()
                ? node.get(field).asString()
                : null;
    }
}
