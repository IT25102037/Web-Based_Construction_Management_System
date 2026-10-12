package sliit.construction.construction.service;

import sliit.construction.construction.dto.ProgressIssueDtos;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ProgressIssueService {

    ProgressIssueDtos.Response create(
            ProgressIssueDtos.Request request
    );

    Page<ProgressIssueDtos.Response> list(
            Long projectId,
            Pageable pageable
    );

    Page<ProgressIssueDtos.Response> list(
            Long projectId,
            sliit.construction.construction.entity.IssueStatus status,
            Pageable pageable
    );

    ProgressIssueDtos.Response get(Long id);

    ProgressIssueDtos.Response update(
            Long id,
            ProgressIssueDtos.Request request
    );

    void delete(Long id);
}
