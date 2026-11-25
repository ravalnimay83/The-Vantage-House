package in.nimay.billingsoftware.service.impl;

import in.nimay.billingsoftware.entity.PasswordResetTokenEntity;
import in.nimay.billingsoftware.entity.UserEntity;
import in.nimay.billingsoftware.repository.PasswordResetTokenRepository;
import in.nimay.billingsoftware.repository.UserRepository;
import in.nimay.billingsoftware.service.PasswordResetService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import javax.naming.NamingException;
import javax.naming.directory.Attribute;
import javax.naming.directory.Attributes;
import javax.naming.directory.DirContext;
import javax.naming.directory.InitialDirContext;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Hashtable;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class PasswordResetServiceImpl implements PasswordResetService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${spring.mail.password:}")
    private String mailPassword;

    private static final SecureRandom RANDOM = new SecureRandom();

    @Override
    @Transactional
    public Map<String, Object> sendResetCode(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email address is required.");
        }
        String cleanEmail = email.trim();

        userRepository.findByEmail(cleanEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No account found with email: " + cleanEmail));

        // Invalidate any previous unused codes for this email
        List<PasswordResetTokenEntity> activeTokens = tokenRepository.findByEmailAndUsedFalse(cleanEmail);
        for (PasswordResetTokenEntity old : activeTokens) {
            old.setUsed(true);
        }
        if (!activeTokens.isEmpty()) {
            tokenRepository.saveAll(activeTokens);
        }

        String otp = String.format("%06d", RANDOM.nextInt(1_000_000));
        PasswordResetTokenEntity token = PasswordResetTokenEntity.builder()
                .email(cleanEmail)
                .otpCode(otp)
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .used(false)
                .build();
        tokenRepository.save(token);

        boolean mailConfigured = mailSender != null
                && mailUsername != null && !mailUsername.isBlank()
                && mailPassword != null && !mailPassword.isBlank();

        if (!mailConfigured) {
            log.warn("SMTP mail credentials are not configured (MAIL_USERNAME / MAIL_PASSWORD). Dev OTP for {}: {}", cleanEmail, otp);
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Email service is not configured on the server yet. Set MAIL_USERNAME and MAIL_PASSWORD (Gmail App Password) in backend environment variables."
            );
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailUsername);
            message.setTo(cleanEmail);
            message.setSubject("BizBill - Password Reset Verification Code");
            message.setText(
                    "Hello,\n\n"
                    + "Your BizBill password reset verification code is: " + otp + "\n\n"
                    + "This code will expire in 10 minutes.\n"
                    + "If you did not request a password reset, please ignore this email.\n\n"
                    + "Regards,\nBizBill Team"
            );
            mailSender.send(message);
        } catch (Exception ex) {
            log.error("Failed to send password reset email to {}", cleanEmail, ex);
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to send verification email: " + ex.getMessage()
            );
        }

        return Map.of(
                "message", "Verification code sent to " + cleanEmail,
                "email", cleanEmail
        );
    }

    @Override
    public void verifyResetCode(String email, String code) {
        validateToken(email, code);
    }

    @Override
    @Transactional
    public void resetPassword(String email, String code, String newPassword) {
        if (newPassword == null || newPassword.length() < 4) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 4 characters.");
        }
        PasswordResetTokenEntity token = validateToken(email, code);
        UserEntity user = userRepository.findByEmail(email.trim())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Account not found."));

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);

        token.setUsed(true);
        tokenRepository.save(token);
    }

    @Override
    @Transactional
    public Map<String, Object> sendSignupOtp(String email, String phoneNumber) {
        if (email == null || email.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email address is required.");
        }
        String cleanEmail = email.trim();

        if (!hasValidMailDomain(cleanEmail)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "That email domain can't receive mail. Please check for typos."
            );
        }

        if (userRepository.findByEmail(cleanEmail).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "You're already here! Sign in instead.");
        }
        if (phoneNumber != null && !phoneNumber.isBlank() && userRepository.findByPhoneNumber(phoneNumber.trim()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This mobile number is already registered. Sign in instead.");
        }

        List<PasswordResetTokenEntity> activeTokens = tokenRepository.findByEmailAndUsedFalse(cleanEmail);
        for (PasswordResetTokenEntity old : activeTokens) {
            old.setUsed(true);
        }
        if (!activeTokens.isEmpty()) {
            tokenRepository.saveAll(activeTokens);
        }

        String otp = String.format("%06d", RANDOM.nextInt(1_000_000));
        PasswordResetTokenEntity token = PasswordResetTokenEntity.builder()
                .email(cleanEmail)
                .otpCode(otp)
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .used(false)
                .build();
        tokenRepository.save(token);

        boolean mailConfigured = mailSender != null
                && mailUsername != null && !mailUsername.isBlank()
                && mailPassword != null && !mailPassword.isBlank();

        if (!mailConfigured) {
            log.warn("SMTP not configured. Dev Signup OTP for {}: {}", cleanEmail, otp);
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Email service is not configured on the server."
            );
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailUsername);
            message.setTo(cleanEmail);
            message.setSubject("BizBill - Verify Your Account (6-Digit Code)");
            message.setText(
                    "Welcome to the BizBill crew!\n\n"
                    + "Your 6-digit verification code is: " + otp + "\n\n"
                    + "This code expires in 10 minutes.\n\n"
                    + "Your style. Your rules.\nBizBill Team"
            );
            mailSender.send(message);
        } catch (Exception ex) {
            log.error("Failed to send signup OTP email to {}", cleanEmail, ex);
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Failed to send verification email: " + ex.getMessage()
            );
        }

        return Map.of(
                "message", "Verification code sent to " + cleanEmail,
                "email", cleanEmail
        );
    }

    @Override
    @Transactional
    public void verifySignupOtp(String email, String code) {
        PasswordResetTokenEntity token = validateToken(email, code);
        token.setUsed(true);
        tokenRepository.save(token);
    }

    private PasswordResetTokenEntity validateToken(String email, String code) {
        if (email == null || email.isBlank() || code == null || code.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email and verification code are required.");
        }
        String cleanEmail = email.trim();
        String cleanCode = code.trim();

        PasswordResetTokenEntity token = tokenRepository
                .findTopByEmailAndUsedFalseOrderByCreatedAtDesc(cleanEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "No active verification code found. Please request a new one."));

        if (token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Verification code has expired. Please request a new one.");
        }

        if (!token.getOtpCode().equals(cleanCode)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid verification code.");
        }

        return token;
    }

    private boolean hasValidMailDomain(String email) {
        int atIdx = email.indexOf('@');
        if (atIdx < 1 || atIdx >= email.length() - 1) {
            return false;
        }
        String domain = email.substring(atIdx + 1).trim();
        try {
            Hashtable<String, String> env = new Hashtable<>();
            env.put("java.naming.factory.initial", "com.sun.jndi.dns.DnsContextFactory");
            env.put("com.sun.jndi.dns.timeout.initial", "3000");
            env.put("com.sun.jndi.dns.timeout.retries", "1");
            DirContext ctx = new InitialDirContext(env);
            Attributes attrs = ctx.getAttributes(domain, new String[]{"MX"});
            Attribute mx = attrs.get("MX");
            if (mx != null && mx.size() > 0) {
                return true;
            }
            // Fallback to A record if domain receives mail without explicit MX
            Attributes aAttrs = ctx.getAttributes(domain, new String[]{"A"});
            Attribute a = aAttrs.get("A");
            return a != null && a.size() > 0;
        } catch (NamingException e) {
            return false;
        }
    }
}
