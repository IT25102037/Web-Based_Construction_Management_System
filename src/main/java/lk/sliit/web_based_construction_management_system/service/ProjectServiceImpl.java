package lk.sliit.web_based_construction_management_system.service;

import sliit.construction.construction.dto.ProjectDtos;
import sliit.construction.construction.entity.Project;
import sliit.construction.construction.entity.ProjectStatus;
import sliit.construction.construction.entity.Task;
import sliit.construction.construction.entity.User;
import sliit.construction.construction.exception.ResourceNotFoundException;
import sliit.construction.construction.repository.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import org.springframework.stereotype.Service;

import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class ProjectServiceImpl implements ProjectService {

 private final ProjectRepository repo;
 private final UserRepository users;
 private final TaskRepository taskRepo;
 private final TaskAssignmentRepository taskAssignmentRepo;
 private final MilestoneRepository milestoneRepo;
 private final ProgressReportRepository progressReportRepo;
 private final ProgressIssueRepository progressIssueRepo;
 private final DocumentRepository documentRepo;

 public ProjectServiceImpl(
         ProjectRepository repo,
         UserRepository users,
         TaskRepository taskRepo,
         TaskAssignmentRepository taskAssignmentRepo,
         MilestoneRepository milestoneRepo,
         ProgressReportRepository progressReportRepo,
         ProgressIssueRepository progressIssueRepo,
         DocumentRepository documentRepo
 ) {
  this.repo = repo;
  this.users = users;
  this.taskRepo = taskRepo;
  this.taskAssignmentRepo = taskAssignmentRepo;
  this.milestoneRepo = milestoneRepo;
  this.progressReportRepo = progressReportRepo;
  this.progressIssueRepo = progressIssueRepo;
  this.documentRepo = documentRepo;
 }


 // =========================================================
 // CREATE
 // =========================================================

 @Override
 @Transactional
 public ProjectDtos.Response create(
         ProjectDtos.Request r
 ) {

  Project project =
          new Project();


  build(
          project,
          r
  );


  Project savedProject =
          repo.save(
                  project
          );


  return map(
          savedProject
  );
 }


 // =========================================================
 // LIST PROJECTS
 // =========================================================

 @Override
 @Transactional(readOnly = true)
 public Page<ProjectDtos.Response> list(
         String search,
         Pageable p
 ) {

  Page<Project> projects;


  if (
          search == null ||
                  search.isBlank()
  ) {

   projects =
           repo.findAll(p);

  } else {

   projects =
           repo.findByNameContainingIgnoreCase(
                   search,
                   p
           );
  }


  return projects.map(
          this::map
  );
 }


 // =========================================================
 // LIST BY STATUS
 // =========================================================

 @Override
 @Transactional(readOnly = true)
 public Page<ProjectDtos.Response> listByStatus(
         ProjectStatus status,
         Pageable p
 ) {

  return repo
          .findByStatus(
                  status,
                  p
          )
          .map(
                  this::map
          );
 }


 // =========================================================
 // LIST BY MANAGER
 // =========================================================

 @Override
 @Transactional(readOnly = true)
 public Page<ProjectDtos.Response> listByManager(
         Long managerId,
         Pageable p
 ) {

  return repo
          .findByManagerId(
                  managerId,
                  p
          )
          .map(
                  this::map
          );
 }


 // =========================================================
 // GET PROJECT
 // =========================================================

 @Override
 @Transactional(readOnly = true)
 public ProjectDtos.Response get(
         Long id
 ) {

  return map(
          entity(id)
  );
 }


 // =========================================================
 // UPDATE
 // =========================================================

 @Override
 @Transactional
 public ProjectDtos.Response update(
         Long id,
         ProjectDtos.Request r
 ) {

  Project project =
          entity(id);


  build(
          project,
          r
  );


  Project updatedProject =
          repo.save(
                  project
          );


  return map(
          updatedProject
  );
 }


 // =========================================================
 // DELETE PROJECT (CASCADE-DELETES TASKS AND ALL RELATED DATA)
 // =========================================================

 @Override
 @Transactional
 public void delete(
         Long id
 ) {

  Project project =
          entity(id);

  // 1. Find all tasks belonging to this project
  List<Task> tasks = taskRepo.findByProjectId(id);
  if (tasks != null && !tasks.isEmpty()) {
   List<Long> taskIds = tasks.stream()
           .map(Task::getId)
           .collect(Collectors.toList());

   // 1a. Delete task assignments
   taskAssignmentRepo.deleteByTaskIdIn(taskIds);

   // 1b. Delete progress reports linked to these tasks
   progressReportRepo.deleteByTaskIdIn(taskIds);

   // 1c. Delete progress issues linked to these tasks
   progressIssueRepo.deleteByTaskIdIn(taskIds);

   // 1d. Delete all tasks for this project
   taskRepo.deleteByProjectId(id);
  }

  // 2. Delete progress reports directly linked to this project
  progressReportRepo.deleteByProjectId(id);

  // 3. Delete progress issues directly linked to this project
  progressIssueRepo.deleteByProjectId(id);

  // 4. Delete milestones for this project
  milestoneRepo.deleteByProjectId(id);

  // 5. Delete documents for this project
  documentRepo.deleteByProjectId(id);

  // 6. Delete the project itself
  repo.delete(
          project
  );
 }


 // =========================================================
 // FIND PROJECT
 // =========================================================

 private Project entity(
         Long id
 ) {

  return repo
          .findById(id)
          .orElseThrow(
                  () ->
                          new ResourceNotFoundException(
                                  "Project not found: " + id
                          )
          );
 }


 // =========================================================
 // BUILD PROJECT
 // =========================================================

 private Project build(
         Project p,
         ProjectDtos.Request r
 ) {

  Long targetManagerId = r.managerId();
  if (targetManagerId == null) {
      org.springframework.security.core.Authentication auth =
              org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
      if (auth != null && auth.getName() != null) {
          User currentUser = users.findByUsername(auth.getName())
                  .or(() -> users.findByEmail(auth.getName()))
                  .orElse(null);
          if (currentUser != null) {
              targetManagerId = currentUser.getId();
          }
      }
  }
  if (targetManagerId == null && p.getManager() != null) {
      targetManagerId = p.getManager().getId();
  }
  if (targetManagerId == null) {
      throw new ResourceNotFoundException("Manager user ID is required");
  }
  final Long finalManagerId = targetManagerId;
  User manager =
          users
                  .findById(
                          finalManagerId
                  )
                  .orElseThrow(
                          () ->
                                  new ResourceNotFoundException(
                                          "Manager user not found: "
                                                  + finalManagerId
                                  )
                  );


  p.setName(
          r.name()
  );


  p.setDescription(
          r.description()
  );


  p.setLocation(
          r.location()
  );


  p.setStartDate(
          r.startDate()
  );


  p.setEndDate(
          r.endDate()
  );


  p.setActualEndDate(
          r.actualEndDate()
  );


  p.setBudget(
          r.budget()
  );


  p.setResourceAllocation(
          r.resourceAllocation()
  );


  p.setStatus(
          r.status()
  );


  p.setManager(
          manager
  );


  return p;
 }


 // =========================================================
 // ENTITY → DTO
 // =========================================================

 private ProjectDtos.Response map(
         Project p
 ) {

  User manager =
          p.getManager();


  Long managerId =
          manager != null
                  ? manager.getId()
                  : null;


  String managerName =
          manager != null
                  ? manager.getFullName()
                  : "Not assigned";


  return new ProjectDtos.Response(

          p.getId(),

          p.getName(),

          p.getDescription(),

          p.getLocation(),

          p.getStartDate(),

          p.getEndDate(),

          p.getActualEndDate(),

          p.getBudget(),

          p.getResourceAllocation(),

          p.getStatus(),

          managerId,

          managerName,

          p.getCreatedAt(),

          p.getUpdatedAt()
  );
 }
}