package sliit.construction.construction.service;

import sliit.construction.construction.dto.TaskAssignmentDtos;
import sliit.construction.construction.entity.AssignmentStatus;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface TaskAssignmentService {

    TaskAssignmentDtos.Response create(
            TaskAssignmentDtos.Request request
    );

    Page<TaskAssignmentDtos.Response> list(
            Pageable pageable
    );

    Page<TaskAssignmentDtos.Response> listByTask(
            Long taskId,
            Pageable pageable
    );

    Page<TaskAssignmentDtos.Response> listByStaff(
            Long staffId,
            Pageable pageable
    );

    Page<TaskAssignmentDtos.Response> listByStatus(
            AssignmentStatus status,
            Pageable pageable
    );

    TaskAssignmentDtos.Response get(
            Long id
    );

    TaskAssignmentDtos.Response update(
            Long id,
            TaskAssignmentDtos.Request request
    );

    void delete(
            Long id
    );
}