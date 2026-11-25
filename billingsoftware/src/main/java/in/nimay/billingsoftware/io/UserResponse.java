package in.nimay.billingsoftware.io;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.sql.Timestamp;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserResponse {

    private String name;
    private String userId;
    private String email;
    private String phoneNumber;
    private String role;
    private String provider;
    private String avatarUrl;
    private Boolean passwordSet;
    private Integer xp;
    private Timestamp createdAt;
    private Timestamp updatedAt;

}
