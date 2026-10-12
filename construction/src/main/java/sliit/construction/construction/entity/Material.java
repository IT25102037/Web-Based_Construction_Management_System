package sliit.construction.construction.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity @Table(name="materials")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Material {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(length=50) private String code;
    @Column(nullable=false, length=150) private String name;
    @Column(length=80) private String category;
    @Column(nullable=false, precision=18, scale=3) private BigDecimal quantity;
    @Column(nullable=false, length=30) private String unit;
    @Column(length=150) private String supplier;
    @Column(precision=18, scale=2) private BigDecimal unitPrice;
    @Column(nullable=false, precision=18, scale=3) private BigDecimal stockThreshold;
    @Column(length=1000) private String purchaseRequest;
    @Enumerated(EnumType.STRING) @Column(nullable=false, length=30) private DeliveryStatus deliveryStatus;

    @CreationTimestamp @Column(nullable=false, updatable=false) private LocalDateTime createdAt;
    @UpdateTimestamp @Column(nullable=false) private LocalDateTime updatedAt;
}
