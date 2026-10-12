package sliit.construction.construction.service;

import sliit.construction.construction.dto.TaskDtos;
import sliit.construction.construction.entity.Project;
import sliit.construction.construction.entity.Task;
import sliit.construction.construction.entity.TaskStatus;
import sliit.construction.construction.entity.User;
import sliit.construction.construction.event.TaskBlockedEvent;
import sliit.construction.construction.exception.ResourceNotFoundException;
import sliit.construction.construction.repository.ProgressIssueRepository;
import sliit.construction.construction.repository.ProgressReportRepository;
import sliit.construction.construction.repository.ProjectRepository;
import sliit.construction.construction.repository.TaskAssignmentRepository;
import sliit.construction.construction.repository.TaskRepository;
import sliit.construction.construction.repository.UserRepository;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TaskServiceImpl implements TaskService {

	private final TaskRepository taskRepository;
	private final ProjectRepository projectRepository;
	private final UserRepository userRepository;
	private final TaskAssignmentRepository taskAssignmentRepository;
	private final ProgressReportRepository progressReportRepository;
	private final ProgressIssueRepository progressIssueRepository;
	private final ApplicationEventPublisher eventPublisher;

	public TaskServiceImpl(
			TaskRepository taskRepository,
			ProjectRepository projectRepository,
			UserRepository userRepository,
			TaskAssignmentRepository taskAssignmentRepository,
			ProgressReportRepository progressReportRepository,
			ProgressIssueRepository progressIssueRepository
	) {
		this(taskRepository, projectRepository, userRepository, taskAssignmentRepository, progressReportRepository, progressIssueRepository, null);
	}

	@Autowired
	public TaskServiceImpl(
			TaskRepository taskRepository,
			ProjectRepository projectRepository,
			UserRepository userRepository,
			TaskAssignmentRepository taskAssignmentRepository,
			ProgressReportRepository progressReportRepository,
			ProgressIssueRepository progressIssueRepository,
			ApplicationEventPublisher eventPublisher
	) {
		this.taskRepository = taskRepository;
		this.projectRepository = projectRepository;
		this.userRepository = userRepository;
		this.taskAssignmentRepository = taskAssignmentRepository;
		this.progressReportRepository = progressReportRepository;
		this.progressIssueRepository = progressIssueRepository;
		this.eventPublisher = eventPublisher;
	}

	@Override
	@Transactional
	public TaskDtos.Response create(TaskDtos.Request request) {

		Task task = buildTask(new Task(), request);

		Task saved = taskRepository.save(task);

		if (saved.getStatus() == TaskStatus.BLOCKED && eventPublisher != null) {
			eventPublisher.publishEvent(new TaskBlockedEvent(saved));
		}

		return map(saved);
	}

	@Override
	@Transactional(readOnly = true)
	public Page<TaskDtos.Response> list(
			TaskStatus status,
			Long projectId,
			Pageable pageable
	) {

		Page<Task> tasks;

		if (projectId != null && status != null) {

			tasks = taskRepository.findByProjectIdAndStatus(
					projectId,
					status,
					pageable
			);

		} else if (projectId != null) {

			tasks = taskRepository.findByProjectId(
					projectId,
					pageable
			);

		} else if (status != null) {

			tasks = taskRepository.findByStatus(
					status,
					pageable
			);

		} else {

			tasks = taskRepository.findAll(pageable);
		}

		return tasks.map(this::map);
	}

	@Override
	@Transactional(readOnly = true)
	public Page<TaskDtos.Response> assignedTo(
			Long userId,
			Pageable pageable
	) {

		return taskRepository
				.findByAssigneeId(userId, pageable)
				.map(this::map);
	}

	@Override
	@Transactional(readOnly = true)
	public TaskDtos.Response get(Long id) {

		return map(getTask(id));
	}

	@Override
	@Transactional
	public TaskDtos.Response update(
			Long id,
			TaskDtos.Request request
	) {

		Task task = getTask(id);
		TaskStatus previousStatus = task.getStatus();

		buildTask(task, request);

		Task saved = taskRepository.save(task);

		if (previousStatus != TaskStatus.BLOCKED && saved.getStatus() == TaskStatus.BLOCKED && eventPublisher != null) {
			eventPublisher.publishEvent(new TaskBlockedEvent(saved));
		}

		return map(saved);
	}

	@Override
	@Transactional
	public void delete(Long id) {

		Task task = getTask(id);

		taskAssignmentRepository.deleteByTaskId(id);
		progressReportRepository.deleteByTaskId(id);
		progressIssueRepository.deleteByTaskId(id);

		taskRepository.delete(task);
	}

	private Task getTask(Long id) {

		return taskRepository
				.findById(id)
				.orElseThrow(() ->
						new ResourceNotFoundException(
								"Task not found with ID: " + id
						)
				);
	}

	private Task buildTask(
			Task task,
			TaskDtos.Request request
	) {

		Project project = projectRepository
				.findById(request.projectId())
				.orElseThrow(() ->
						new ResourceNotFoundException(
								"Project not found with ID: "
										+ request.projectId()
						)
				);

		User assignee = userRepository
				.findById(request.assigneeId())
				.orElseThrow(() ->
						new ResourceNotFoundException(
								"Assignee not found with ID: "
										+ request.assigneeId()
						)
				);

		task.setTitle(request.title().trim());

		task.setDescription(
				request.description() != null
						? request.description().trim()
						: null
		);

		task.setDeadline(request.deadline());

		task.setPriority(request.priority());

		task.setStatus(request.status());

		task.setProject(project);

		task.setAssignee(assignee);

		return task;
	}

	private TaskDtos.Response map(Task task) {

		Long projectId = null;
		String projectName = null;
		if (task.getProject() != null) {
			projectId = task.getProject().getId();
			projectName = task.getProject().getName();
		}

		Long assigneeId = null;
		String assigneeName = null;
		if (task.getAssignee() != null) {
			assigneeId = task.getAssignee().getId();
			assigneeName = task.getAssignee().getFullName() != null && !task.getAssignee().getFullName().isBlank()
					? task.getAssignee().getFullName()
					: task.getAssignee().getUsername();
		}

		return new TaskDtos.Response(
				task.getId(),
				task.getTitle(),
				task.getDescription(),
				task.getDeadline(),
				task.getPriority(),
				task.getStatus(),
				projectId,
				projectName,
				assigneeId,
				assigneeName,
				task.getCreatedAt(),
				task.getUpdatedAt()
		);
	}
}