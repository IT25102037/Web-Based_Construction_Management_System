package lk.sliit.web_based_construction_management_system.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import sliit.construction.construction.entity.Document;
import sliit.construction.construction.entity.User;

import java.util.List;

public interface DocumentRepository extends JpaRepository<Document, Long> {

    Page<Document> findByProjectId(Long projectId, Pageable pageable);

    Page<Document> findByDocumentTypeIgnoreCase(String documentType, Pageable pageable);

    Page<Document> findByProjectIdAndDocumentTypeIgnoreCase(Long projectId, String documentType, Pageable pageable);

    @Query("SELECT d FROM Document d WHERE " +
           "(:projectId IS NULL OR d.project.id = :projectId) AND " +
           "(:documentType IS NULL OR :documentType = '' OR UPPER(d.documentType) = UPPER(:documentType)) AND " +
           "(:search IS NULL OR :search = '' OR UPPER(d.title) LIKE UPPER(CONCAT('%', :search, '%')) OR UPPER(d.description) LIKE UPPER(CONCAT('%', :search, '%')))")
    Page<Document> searchDocuments(@Param("projectId") Long projectId,
                                   @Param("documentType") String documentType,
                                   @Param("search") String search,
                                   Pageable pageable);

    List<Document> findByUploadedBy(User uploadedBy);

    List<Document> findByUploadedById(Long uploadedById);

    void deleteByProjectId(Long projectId);

    long countByDocumentTypeIgnoreCase(String documentType);
}
