package sliit.construction.construction.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name="users", uniqueConstraints={@UniqueConstraint(name="uk_users_username", columnNames="username"),
                                           @UniqueConstraint(name="uk_users_email", columnNames="email")})
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class User {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;
    @Column(nullable=false, length=50) private String username;
    @Column(nullable=false, length=120) private String email;
    @Column(nullable=false, length=255) private String passwordHash;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=40) private Role role;
    @Column(nullable=false, length=120) private String fullName;
    @Column(length=30) private String phoneNumber;
    @Lob @Column(name="profile_picture") private String profilePicture;
    @CreationTimestamp @Column(nullable=false, updatable=false) private LocalDateTime createdAt;
    @UpdateTimestamp @Column(nullable=false) private LocalDateTime updatedAt;
}
