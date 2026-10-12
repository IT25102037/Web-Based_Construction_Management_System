package sliit.construction.construction.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "stock_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StockTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "material_id", nullable = false)
    private Material material;

    @Column(nullable = false, length = 30)
    private String transactionType; // RECEIVE, ISSUE, ADJUSTMENT

    @Column(nullable = false, precision = 18, scale = 3)
    private BigDecimal quantity;

    @Column(precision = 18, scale = 3)
    private BigDecimal previousQuantity;

    @Column(nullable = false, precision = 18, scale = 3)
    private BigDecimal newQuantity;

    @Column(length = 500)
    private String referenceNotes;

    @Column(length = 100)
    private String performedBy;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
