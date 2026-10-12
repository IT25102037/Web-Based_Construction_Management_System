package sliit.construction.construction.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "client_project_requests")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClientProjectRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    /*
     * The client who created this request.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "client_id",
            nullable = false
    )
    @OnDelete(action = OnDeleteAction.CASCADE)
    private User client;


    @Column(
            nullable = false,
            length = 150
    )
    private String projectName;


    @Column(
            nullable = false,
            length = 80
    )
    private String projectType;


    @Column(
            nullable = false,
            length = 200
    )
    private String location;


    @Column(
            nullable = false,
            length = 1000
    )
    private String description;


    @Column(
            nullable = false,
            precision = 15,
            scale = 2
    )
    private BigDecimal estimatedBudget;


    @Column(nullable = false)
    private LocalDate preferredStartDate;


    @Enumerated(EnumType.STRING)
    @Column(
            nullable = false,
            length = 30
    )
    @Builder.Default
    private ProjectRequestStatus status =
            ProjectRequestStatus.PENDING;


    @CreationTimestamp
    @Column(
            nullable = false,
            updatable = false
    )
    private LocalDateTime createdAt;


    @UpdateTimestamp
    @Column(nullable = false)
    private LocalDateTime updatedAt;
}
