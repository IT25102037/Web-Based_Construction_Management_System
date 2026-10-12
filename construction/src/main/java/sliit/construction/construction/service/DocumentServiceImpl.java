package sliit.construction.construction.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import sliit.construction.construction.dto.DocumentDtos;
import sliit.construction.construction.entity.Document;
import sliit.construction.construction.entity.Project;
import sliit.construction.construction.entity.User;
import sliit.construction.construction.exception.ResourceNotFoundException;
import sliit.construction.construction.repository.DocumentRepository;
import sliit.construction.construction.repository.ProjectRepository;
import sliit.construction.construction.repository.UserRepository;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
@Transactional
public class DocumentServiceImpl implements DocumentService {

    private final DocumentRepository repo;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    public DocumentServiceImpl(DocumentRepository repo,
                               ProjectRepository projectRepository,
                               UserRepository userRepository) {
        this.repo = repo;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
    }

    @Override
    public DocumentDtos.Response create(DocumentDtos.Request request) {
        Document doc = new Document();
        buildEntity(doc, request);
        Document saved = repo.save(doc);
        return mapToResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<DocumentDtos.Response> list(Long projectId, String documentType, String search, Pageable pageable) {
        String cleanSearch = (search != null && !search.isBlank()) ? search.trim() : null;
        String cleanType = (documentType != null && !documentType.isBlank()) ? documentType.trim() : null;

        Page<Document> page = repo.searchDocuments(projectId, cleanType, cleanSearch, pageable);
        return page.map(this::mapToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentDtos.Response get(Long id) {
        return mapToResponse(findEntity(id));
    }

    @Override
    public DocumentDtos.Response update(Long id, DocumentDtos.Request request) {
        Document doc = findEntity(id);
        buildEntity(doc, request);
        Document updated = repo.save(doc);
        return mapToResponse(updated);
    }

    @Override
    public void delete(Long id) {
        Document doc = findEntity(id);
        repo.delete(doc);
    }

    @Override
    @Transactional(readOnly = true)
    public DocumentDtos.StatsResponse getStats() {
        long total = repo.count();
        long blueprints = repo.countByDocumentTypeIgnoreCase("BLUEPRINT");
        long contracts = repo.countByDocumentTypeIgnoreCase("CONTRACT");
        long permits = repo.countByDocumentTypeIgnoreCase("PERMIT");
        long reports = repo.countByDocumentTypeIgnoreCase("REPORT");
        long specifications = repo.countByDocumentTypeIgnoreCase("SPECIFICATION");
        long others = total - (blueprints + contracts + permits + reports + specifications);
        if (others < 0) others = 0;

        return new DocumentDtos.StatsResponse(total, blueprints, contracts, permits, reports, specifications, others);
    }

    @Override
    public String uploadFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Uploaded file cannot be empty.");
        }

        try {
            String uploadDir = "uploads/documents";
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }

            String baseName = (originalFilename != null && originalFilename.contains("."))
                    ? originalFilename.substring(0, originalFilename.lastIndexOf(".")).replaceAll("[^a-zA-Z0-9.-]", "_")
                    : "document";

            String generatedFilename = baseName + "_" + UUID.randomUUID().toString().substring(0, 8) + extension;
            Path targetLocation = uploadPath.resolve(generatedFilename);

            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);

            return "/uploads/documents/" + generatedFilename;
        } catch (IOException ex) {
            throw new RuntimeException("Could not store file. Please try again: " + ex.getMessage(), ex);
        }
    }

    private Document findEntity(Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with ID: " + id));
    }

    private void buildEntity(Document doc, DocumentDtos.Request request) {
        doc.setTitle(request.title());
        doc.setDocumentType(request.documentType() != null ? request.documentType() : "OTHER");
        doc.setFileUrl(request.fileUrl());
        doc.setFilePath(request.filePath() != null ? request.filePath() : request.fileUrl());
        doc.setFileSize(request.fileSize());
        doc.setVersion(request.version() != null && !request.version().isBlank() ? request.version() : "v1.0");
        doc.setDescription(request.description());

        Project project = projectRepository.findById(request.projectId())
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with ID: " + request.projectId()));
        doc.setProject(project);

        User uploadedBy = userRepository.findById(request.uploadedById())
                .orElseThrow(() -> new ResourceNotFoundException("User not found with ID: " + request.uploadedById()));
        doc.setUploadedBy(uploadedBy);
    }

    private DocumentDtos.Response mapToResponse(Document doc) {
        String projectName = doc.getProject() != null ? doc.getProject().getName() : "Unknown Project";
        Long projectId = doc.getProject() != null ? doc.getProject().getId() : null;
        String uploadedByName = doc.getUploadedBy() != null ? doc.getUploadedBy().getFullName() : "Staff";
        Long uploadedById = doc.getUploadedBy() != null ? doc.getUploadedBy().getId() : null;

        return new DocumentDtos.Response(
                doc.getId(),
                doc.getTitle(),
                doc.getDocumentType(),
                doc.getFileUrl(),
                doc.getFilePath(),
                doc.getFileSize(),
                doc.getVersion(),
                doc.getDescription(),
                projectId,
                projectName,
                uploadedById,
                uploadedByName,
                doc.getCreatedAt(),
                doc.getUpdatedAt()
        );
    }
}
