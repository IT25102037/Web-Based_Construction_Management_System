package lk.sliit.web_based_construction_management_system.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import sliit.construction.construction.dto.MaterialRequestDtos;
import sliit.construction.construction.entity.MaterialRequestStatus;

public interface MaterialRequestService {

    MaterialRequestDtos.Response create(
            MaterialRequestDtos.Request request
    );

    Page<MaterialRequestDtos.Response> list(
            String search,
            MaterialRequestStatus status,
            Pageable pageable
    );

    MaterialRequestDtos.Response get(Long id);

    MaterialRequestDtos.Response update(
            Long id,
            MaterialRequestDtos.Request request
    );

    void delete(Long id);
}