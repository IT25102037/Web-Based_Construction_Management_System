package lk.sliit.web_based_construction_management_system.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtFilter) {
        this.jwtFilter = jwtFilter;
    }

    // Password encryption
    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // Authentication manager
    @Bean
    AuthenticationManager authenticationManager(
            AuthenticationConfiguration configuration) throws Exception {

        return configuration.getAuthenticationManager();
    }

    // Security filter chain
    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {

        return http

                // Disable CSRF because JWT authentication is used
                .csrf(c -> c.disable())

                // Enable CORS
                .cors(c -> {})

                // Stateless authentication
                .sessionManagement(s ->
                        s.sessionCreationPolicy(
                                SessionCreationPolicy.STATELESS
                        )
                )

                // Authorization rules
                .authorizeHttpRequests(a -> a

                        // ==========================================
                        // PUBLIC WEBSITE PAGES & ROUTES
                        // ==========================================
                        .requestMatchers(
                                "/",
                                "/error",
                                "/*.html",
                                "/login",
                                "/staff-login",
                                "/dashboard",
                                "/projects",
                                "/project-manager-dashboard",
                                "/project-details",
                                "/tasks",
                                "/progress",
                                "/materials",
                                "/clients",
                                "/users",
                                "/documents",
                                "/reports",
                                "/settings",
                                "/notifications",
                                "/communication",
                                "/activity-logs",
                                "/milestones",
                                "/task-assignments",
                                "/material-requests",
                                "/material-inventory",
                                "/suppliers",
                                "/client-login",
                                "/client-register",
                                "/client-dashboard",
                                "/client-profile",
                                "/client-project-requests",
                                "/roles",
                                "/role-management"
                        ).permitAll()


                        // ==========================================
                        // PUBLIC CSS, JS AND IMAGES
                        // ==========================================
                        .requestMatchers(
                                "/css/**",
                                "/js/**",
                                "/images/**",
                                "/uploads/**",
                                "/favicon.ico"
                        ).permitAll()


                        // ==========================================
                        // LOGIN / AUTH API
                        // ==========================================
                        .requestMatchers(
                                "/api/auth/**"
                        ).permitAll()


                        // ==========================================
                        // EVERYTHING ELSE REQUIRES LOGIN
                        // ==========================================
                        .anyRequest().authenticated()
                )


                // JWT filter
                .addFilterBefore(
                        jwtFilter,
                        UsernamePasswordAuthenticationFilter.class
                )


                .build();
    }
}