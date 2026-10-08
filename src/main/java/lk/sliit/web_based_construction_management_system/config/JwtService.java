package lk.sliit.web_based_construction_management_system.config;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JwtService {
    private final SecretKey key;
    private final long expiration;

    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.expiration-ms}") long expiration) {
        if (secret == null || secret.length() < 32 || secret.startsWith("CHANGE_")) {
            throw new IllegalStateException("Set a real app.jwt.secret of at least 32 characters.");
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiration = expiration;
    }

    public String generate(String username, String role) {
        return generate(username, role, false);
    }

    public String generate(String username, String role, boolean rememberMe) {
        Date now = new Date();
        // 30 days for Remember Me (30 * 24 * 60 * 60 * 1000 = 2592000000 ms), otherwise standard expiration
        long tokenDuration = rememberMe ? (30L * 24 * 60 * 60 * 1000L) : expiration;
        return Jwts.builder()
                .subject(username)
                .claim("role", role)
                .claim("rememberMe", rememberMe)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + tokenDuration))
                .signWith(key)
                .compact();
    }

    public String username(String token) {
        return Jwts.parser().verifyWith(key).build()
                .parseSignedClaims(token).getPayload().getSubject();
    }

    public boolean valid(String token) {
        try {
            Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }
}
