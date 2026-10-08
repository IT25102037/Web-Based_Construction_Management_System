package lk.sliit.web_based_construction_management_system.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;
import sliit.construction.construction.dto.DocumentDtos;

public interface DocumentService {
    DocumentDtos.Response create(DocumentDtos.Request request);
    Page<DocumentDtos.Response> list(Long projectId, String documentType, String search, Pageable pageable);
    DocumentDtos.Response get(Long id);
    DocumentDtos.Response update(Long id, DocumentDtos.Request request);
    void delete(Long id);
    DocumentDtos.StatsResponse getStats();
    String uploadFile(MultipartFile file);
}
