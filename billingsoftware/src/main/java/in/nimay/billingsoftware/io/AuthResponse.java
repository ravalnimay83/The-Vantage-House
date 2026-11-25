package in.nimay.billingsoftware.io;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class AuthResponse {

    private String email;
    private String token;
    private String role;
    private String name;
    private String userId;
    private String phoneNumber;
    private String provider;
    private String avatarUrl;
    private Boolean passwordSet;
    private Integer xp;

    public AuthResponse(String email, String token, String role) {
        this.email = email;
        this.token = token;
        this.role = role;
    }
}
