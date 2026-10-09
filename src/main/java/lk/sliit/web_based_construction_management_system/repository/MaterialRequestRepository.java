package lk.sliit.web_based_construction_management_system.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import sliit.construction.construction.entity.MaterialRequest;
import sliit.construction.construction.entity.MaterialRequestStatus;

import java.util.Optional;

public interface MaterialRequestRepository
        extends JpaRepository<MaterialRequest, Long> {

    Optional<MaterialRequest> findByRequestCode(String requestCode);

    boolean existsByRequestCode(String requestCode);

    boolean existsByRequestCodeAndIdNot(String requestCode, Long id);

    Page<MaterialRequest> findByStatus(
            MaterialRequestStatus status,
            Pageable pageable
    );

    @Query("""
            SELECT r
            FROM MaterialRequest r
            WHERE
            (:search IS NULL OR
             LOWER(r.requestCode) LIKE LOWER(CONCAT('%', :search, '%'))
             OR LOWER(r.materialName) LIKE LOWER(CONCAT('%', :search, '%'))
             OR LOWER(r.projectName) LIKE LOWER(CONCAT('%', :search, '%'))
             OR LOWER(r.requestedBy) LIKE LOWER(CONCAT('%', :search, '%')))
            AND
            (:status IS NULL OR r.status = :status)
            """)
    Page<MaterialRequest> searchRequests(
            @Param("search") String search,
            @Param("status") MaterialRequestStatus status,
            Pageable pageable
    );
}