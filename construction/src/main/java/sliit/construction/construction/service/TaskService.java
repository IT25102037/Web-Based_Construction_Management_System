package sliit.construction.construction.service;

import sliit.construction.construction.dto.TaskDtos;
import sliit.construction.construction.entity.TaskStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface TaskService {

 TaskDtos.Response create(TaskDtos.Request request);

 Page<TaskDtos.Response> list(
         TaskStatus status,
         Long projectId,
         Pageable pageable
 );

 Page<TaskDtos.Response> assignedTo(
         Long userId,
         Pageable pageable
 );

 TaskDtos.Response get(Long id);

 TaskDtos.Response update(
         Long id,
         TaskDtos.Request request
 );

 void delete(Long id);
}