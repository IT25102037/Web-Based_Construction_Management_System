package sliit.construction.construction.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity @Table(name="progress_reports")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProgressReport {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(nullable=false) private Integer completionPercentage;
    @Column(nullable=false, length=2000) private String statusUpdate;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=20) private ProgressStatus status;

    @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="project_id", nullable=false) private Project project;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="task_id") private Task task;
    @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="reported_by_id", nullable=false) private User reportedBy;

    @CreationTimestamp @Column(nullable=false, updatable=false) private LocalDateTime createdAt;
    @UpdateTimestamp @Column(nullable=false) private LocalDateTime updatedAt;
}
