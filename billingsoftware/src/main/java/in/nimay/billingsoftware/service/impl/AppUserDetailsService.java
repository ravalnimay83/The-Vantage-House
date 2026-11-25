package in.nimay.billingsoftware.service.impl;

import in.nimay.billingsoftware.entity.UserEntity;
import in.nimay.billingsoftware.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
@RequiredArgsConstructor
public class AppUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        UserEntity existingUser = userRepository.findByEmailOrPhoneNumber(identifier)
                .orElseThrow(() -> new UsernameNotFoundException("Account not found: " + identifier));

        String principal = existingUser.getEmail() != null && !existingUser.getEmail().isBlank()
                ? existingUser.getEmail()
                : existingUser.getPhoneNumber();

        String encodedPassword = existingUser.getPassword() != null ? existingUser.getPassword() : "";

        return new User(
                principal,
                encodedPassword,
                Collections.singleton(new SimpleGrantedAuthority(existingUser.getRole()))
        );
    }
}
