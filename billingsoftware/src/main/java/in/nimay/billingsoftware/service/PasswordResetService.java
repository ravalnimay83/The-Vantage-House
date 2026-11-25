package in.nimay.billingsoftware.service;

import java.util.Map;

public interface PasswordResetService {

    Map<String, Object> sendResetCode(String email);

    void verifyResetCode(String email, String code);

    void resetPassword(String email, String code, String newPassword);

    Map<String, Object> sendSignupOtp(String email, String phoneNumber);

    void verifySignupOtp(String email, String code);

}
