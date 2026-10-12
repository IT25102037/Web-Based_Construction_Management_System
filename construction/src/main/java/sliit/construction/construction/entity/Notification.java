package sliit.construction.construction.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity @Table(name="notifications")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Notification {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false, length=180) private String title;
    @Column(nullable=false, length=2000) private String message;
    @Column(nullable=false) private Boolean readFlag;
    @Column(length=50) private String type;

    @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="recipient_id", nullable=false) private User recipient;

    @CreationTimestamp @Column(nullable=false, updatable=false) private LocalDateTime createdAt;
    @UpdateTimestamp @Column(nullable=false) private LocalDateTime updatedAt;
}
