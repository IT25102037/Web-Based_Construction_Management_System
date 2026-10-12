package sliit.construction.construction.service;

import sliit.construction.construction.dto.TaskAssignmentDtos;
import sliit.construction.construction.entity.AssignmentStatus;
import sliit.construction.construction.entity.Role;
import sliit.construction.construction.entity.Task;
import sliit.construction.construction.entity.TaskAssignment;
import sliit.construction.construction.entity.User;
import sliit.construction.construction.exception.DuplicateResourceException;
import sliit.construction.construction.exception.ResourceNotFoundException;
import sliit.construction.construction.repository.TaskAssignmentRepository;
import sliit.construction.construction.repository.TaskRepository;
import sliit.construction.construction.repository.UserRepository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TaskAssignmentServiceImpl
        implements TaskAssignmentService {

    private final TaskAssignmentRepository assignmentRepository;
    private final TaskRepository taskRepository;
    private final UserRepository userRepository;

    public TaskAssignmentServiceImpl(
            TaskAssignmentRepository assignmentRepository,
            TaskRepository taskRepository,
            UserRepository userRepository
    ) {
        this.assignmentRepository = assignmentRepository;
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
    }

    @Override
    @Transactional
    public TaskAssignmentDtos.Response create(
            TaskAssignmentDtos.Request request
    ) {

        Task task = getTask(request.taskId());

        User staff = getStaff(request.staffId());

        if (assignmentRepository.existsByTaskIdAndStaffId(
                request.taskId(),
                request.staffId()
        )) {

            throw new DuplicateResourceException(
                    "This staff member is already assigned to this task."
            );
        }

        TaskAssignment assignment =
                TaskAssignment.builder()
                        .task(task)
                        .staff(staff)
                        .assignedDate(request.assignedDate())
                        .responsibility(
                                request.responsibility().trim()
                        )
                        .status(request.status())
                        .build();

        return map(
                assignmentRepository.save(assignment)
        );
    }

    @Override
    public Page<TaskAssignmentDtos.Response> list(
            Pageable pageable
    ) {

        return assignmentRepository
                .findAll(pageable)
                .map(this::map);
    }

    @Override
    public Page<TaskAssignmentDtos.Response> listByTask(
            Long taskId,
            Pageable pageable
    ) {

        getTask(taskId);

        return assignmentRepository
                .findByTaskId(taskId, pageable)
                .map(this::map);
    }

    @Override
    public Page<TaskAssignmentDtos.Response> listByStaff(
            Long staffId,
            Pageable pageable
    ) {

        getStaff(staffId);

        return assignmentRepository
                .findByStaffId(staffId, pageable)
                .map(this::map);
    }

    @Override
    public Page<TaskAssignmentDtos.Response> listByStatus(
            AssignmentStatus status,
            Pageable pageable
    ) {

        return assignmentRepository
                .findByStatus(status, pageable)
                .map(this::map);
    }

    @Override
    public TaskAssignmentDtos.Response get(
            Long id
    ) {

        return map(getAssignment(id));
    }

    @Override
    @Transactional
    public TaskAssignmentDtos.Response update(
            Long id,
            TaskAssignmentDtos.Request request
    ) {

        TaskAssignment assignment =
                getAssignment(id);

        Task task =
                getTask(request.taskId());

        User staff =
                getStaff(request.staffId());

        if (assignmentRepository
                .existsByTaskIdAndStaffIdAndIdNot(
                        request.taskId(),
                        request.staffId(),
                        id
                )) {

            throw new DuplicateResourceException(
                    "This staff member is already assigned to this task."
            );
        }

        assignment.setTask(task);

        assignment.setStaff(staff);

        assignment.setAssignedDate(
                request.assignedDate()
        );

        assignment.setResponsibility(
                request.responsibility().trim()
        );

        assignment.setStatus(
                request.status()
        );

        return map(
                assignmentRepository.save(assignment)
        );
    }

    @Override
    @Transactional
    public void delete(
            Long id
    ) {

        TaskAssignment assignment =
                getAssignment(id);

        assignmentRepository.delete(assignment);
    }

    private TaskAssignment getAssignment(
            Long id
    ) {

        return assignmentRepository
                .findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Task assignment not found with ID: "
                                        + id
                        )
                );
    }

    private Task getTask(
            Long id
    ) {

        return taskRepository
                .findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Task not found with ID: "
                                        + id
                        )
                );
    }

    private User getStaff(
            Long id
    ) {

        User user =
                userRepository
                        .findById(id)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Staff member not found with ID: "
                                                + id
                                )
                        );

        if (user.getRole() == Role.CLIENT) {

            throw new IllegalArgumentException(
                    "A client cannot be assigned to a construction task."
            );
        }

        return user;
    }

    private TaskAssignmentDtos.Response map(
            TaskAssignment assignment
    ) {

        User staff =
                assignment.getStaff();

        return new TaskAssignmentDtos.Response(

                assignment.getId(),

                assignment.getTask().getId(),

                assignment.getTask().getTitle(),

                staff.getId(),

                staff.getFullName(),

                staff.getUsername(),

                staff.getRole().name(),

                assignment.getAssignedDate(),

                assignment.getResponsibility(),

                assignment.getStatus(),

                assignment.getCreatedAt(),

                assignment.getUpdatedAt()
        );
    }
}
