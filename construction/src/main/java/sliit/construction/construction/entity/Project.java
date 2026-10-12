package sliit.construction.construction.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity @Table(name="projects")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Project {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false, length=150) private String name;
    @Column(length=2000) private String description;
    @Column(length=1500) private String location;
    @Column(nullable=false) private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate actualEndDate;
    @Column(precision=18, scale=2) private BigDecimal budget;
    @Column(length=2000) private String resourceAllocation;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=30) private ProjectStatus status;

    @ManyToOne(fetch=FetchType.LAZY, optional=false)
    @JoinColumn(name="manager_id", nullable=false)
    private User manager;

    @CreationTimestamp @Column(nullable=false, updatable=false) private LocalDateTime createdAt;
    @UpdateTimestamp @Column(nullable=false) private LocalDateTime updatedAt;
}
