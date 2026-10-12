package sliit.construction.construction;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import sliit.construction.construction.config.JwtService;
import sliit.construction.construction.entity.Role;
import sliit.construction.construction.entity.User;
import sliit.construction.construction.repository.UserRepository;
import sliit.construction.construction.service.UserServiceImpl;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthSecurityUnitTest {

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    // Test secret of at least 32 characters
    private final JwtService jwtService = new JwtService("ThisIsAVerySecureSecretKeyForTesting1234567890!", 86400000L);

    @Test
    @DisplayName("Password hashing: Passwords must be hashed with BCrypt and not plain text")
    void testPasswordHashingSecurity() {
        String rawPassword = "SiteEng#2026Pass!";
        String hash = passwordEncoder.encode(rawPassword);

        assertNotEquals(rawPassword, hash, "Password must not be stored in plain text");
        assertTrue(hash.startsWith("$2a$") || hash.startsWith("$2b$"), "Must use BCrypt format");
        assertTrue(passwordEncoder.matches(rawPassword, hash), "BCrypt must verify matching password");
        assertFalse(passwordEncoder.matches("WrongPassword123", hash), "Wrong password must fail");
    }

    @Test
    @DisplayName("One user's password must NOT match or work for another user's account")
    void testCrossAccountPasswordIsolation() {
        String pmPassword = "Pm#2026Secure!";
        String siteEngPassword = "SiteEng#2026Pass!";

        String pmHash = passwordEncoder.encode(pmPassword);
        String siteEngHash = passwordEncoder.encode(siteEngPassword);

        // Verify isolation
        assertTrue(passwordEncoder.matches(pmPassword, pmHash));
        assertTrue(passwordEncoder.matches(siteEngPassword, siteEngHash));

        assertFalse(passwordEncoder.matches(pmPassword, siteEngHash), "PM password must not work for Site Engineer");
        assertFalse(passwordEncoder.matches(siteEngPassword, pmHash), "Site Engineer password must not work for PM");
    }

    @Test
    @DisplayName("JWT Generation and Validation: Standard vs Remember Me token lifetimes")
    void testJwtTokensAndRememberMe() {
        String username = "siteengineer";
        String role = "SITE_ENGINEER";

        // Standard token
        String standardToken = jwtService.generate(username, role, false);
        assertNotNull(standardToken);
        assertTrue(jwtService.valid(standardToken));
        assertEquals(username, jwtService.username(standardToken));

        // Remember Me token
        String rememberToken = jwtService.generate(username, role, true);
        assertNotNull(rememberToken);
        assertTrue(jwtService.valid(rememberToken));
        assertEquals(username, jwtService.username(rememberToken));

        // Invalid token
        assertFalse(jwtService.valid("invalid.token.signature"));
    }

    @Test
    @DisplayName("Change Password: Validates current password, enforces length, matches confirmation, and hashes new password")
    void testChangePasswordLogic() {
        UserRepository userRepository = mock(UserRepository.class);
        UserServiceImpl userService = new UserServiceImpl(userRepository, passwordEncoder);

        User mockUser = new User();
        mockUser.setId(1L);
        mockUser.setUsername("siteengineer");
        mockUser.setEmail("siteengineer@wbcms.com");
        mockUser.setPasswordHash(passwordEncoder.encode("OldSecurePass#1"));
        mockUser.setRole(Role.SITE_ENGINEER);

        when(userRepository.findByUsername("siteengineer")).thenReturn(Optional.of(mockUser));
        when(userRepository.findByUsernameOrEmail("siteengineer", "siteengineer")).thenReturn(Optional.of(mockUser));
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // 1. Wrong current password must throw BadCredentialsException
        org.springframework.security.authentication.BadCredentialsException ex1 = assertThrows(
                org.springframework.security.authentication.BadCredentialsException.class, () ->
                userService.changePassword("siteengineer", "WrongCurrentPass", "NewSecurePass#2", "NewSecurePass#2"));
        assertTrue(ex1.getMessage().contains("Current password does not match"));

        // 2. Mismatched confirmation must throw IllegalArgumentException
        IllegalArgumentException ex2 = assertThrows(IllegalArgumentException.class, () ->
                userService.changePassword("siteengineer", "OldSecurePass#1", "NewSecurePass#2", "DifferentPass#3"));
        assertTrue(ex2.getMessage().contains("do not match"));

        // 3. Short new password must throw IllegalArgumentException (< 8 chars)
        IllegalArgumentException ex3 = assertThrows(IllegalArgumentException.class, () ->
                userService.changePassword("siteengineer", "OldSecurePass#1", "12345", "12345"));
        assertTrue(ex3.getMessage().contains("at least 8 characters"));

        // 4. Same as old password must throw IllegalArgumentException
        IllegalArgumentException ex4 = assertThrows(IllegalArgumentException.class, () ->
                userService.changePassword("siteengineer", "OldSecurePass#1", "OldSecurePass#1", "OldSecurePass#1"));
        assertTrue(ex4.getMessage().contains("cannot be the same"));

        // 5. Successful change updates hash
        userService.changePassword("siteengineer", "OldSecurePass#1", "NewSecurePass#2", "NewSecurePass#2");
        assertTrue(passwordEncoder.matches("NewSecurePass#2", mockUser.getPasswordHash()), "New password must match");
        assertFalse(passwordEncoder.matches("OldSecurePass#1", mockUser.getPasswordHash()), "Old password must no longer work");
    }

    @Test
    @DisplayName("Registration: Creates account with BCrypt password hash and correct assigned role")
    void testRegistrationWithRoleAndPasswordHashing() {
        UserRepository userRepository = mock(UserRepository.class);
        UserServiceImpl userService = new UserServiceImpl(userRepository, passwordEncoder);

        when(userRepository.existsByUsername("newengineer")).thenReturn(false);
        when(userRepository.existsByEmail("newengineer@wbcms.com")).thenReturn(false);
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User u = invocation.getArgument(0);
            u.setId(99L);
            return u;
        });

        sliit.construction.construction.dto.UserDtos.Request regRequest =
                new sliit.construction.construction.dto.UserDtos.Request(
                        "newengineer",
                        "newengineer@wbcms.com",
                        "NewEngPass#2026",
                        Role.SITE_ENGINEER,
                        "New Site Engineer",
                        "+94 77 123 4567"
                );

        sliit.construction.construction.dto.UserDtos.Response response = userService.create(regRequest);

        assertNotNull(response);
        assertEquals("newengineer", response.username());
        assertEquals("newengineer@wbcms.com", response.email());
        assertEquals(Role.SITE_ENGINEER, response.role());

        // Verify that the user saved has a BCrypt hashed password, never plain text
        verify(userRepository).save(argThat(savedUser -> {
            assertNotEquals("NewEngPass#2026", savedUser.getPasswordHash());
            assertTrue(passwordEncoder.matches("NewEngPass#2026", savedUser.getPasswordHash()));
            assertEquals(Role.SITE_ENGINEER, savedUser.getRole());
            return true;
        }));
    }
}
