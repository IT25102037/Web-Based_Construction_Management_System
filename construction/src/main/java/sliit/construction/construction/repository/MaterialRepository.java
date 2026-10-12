package sliit.construction.construction.repository;

import sliit.construction.construction.entity.DeliveryStatus;
import sliit.construction.construction.entity.Material;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.util.Optional;

public interface MaterialRepository extends JpaRepository<Material, Long> {

    Optional<Material> findByCode(String code);

    boolean existsByCode(String code);

    boolean existsByCodeAndIdNot(String code, Long id);

    Page<Material> findByNameContainingIgnoreCase(String name, Pageable pageable);

    Page<Material> findByDeliveryStatus(DeliveryStatus status, Pageable pageable);

    @Query("SELECT m FROM Material m WHERE " +
           "(:search IS NULL OR LOWER(m.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(m.code) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(m.supplier) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "LOWER(m.category) LIKE LOWER(CONCAT('%', :search, '%'))) AND " +
           "(:category IS NULL OR m.category = :category)")
    Page<Material> searchMaterials(@Param("search") String search,
                                  @Param("category") String category,
                                  Pageable pageable);

    @Query("SELECT COUNT(m) FROM Material m WHERE m.quantity <= 0")
    long countOutOfStock();

    @Query("SELECT COUNT(m) FROM Material m WHERE m.quantity > 0 AND m.quantity <= m.stockThreshold")
    long countLowStock();

    @Query("SELECT COUNT(m) FROM Material m WHERE m.quantity > m.stockThreshold")
    long countInStock();
}
