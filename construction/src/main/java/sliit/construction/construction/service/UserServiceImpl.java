package sliit.construction.construction.service;

import sliit.construction.construction.dto.UserDtos;
import sliit.construction.construction.entity.Document;
import sliit.construction.construction.entity.ProgressIssue;
import sliit.construction.construction.entity.ProgressReport;
import sliit.construction.construction.entity.Project;
import sliit.construction.construction.entity.Role;
import sliit.construction.construction.entity.Task;
import sliit.construction.construction.entity.User;
import sliit.construction.construction.repository.ClientProjectRequestRepository;
import sliit.construction.construction.repository.DocumentRepository;
import sliit.construction.construction.repository.NotificationRepository;
import sliit.construction.construction.repository.ProgressIssueRepository;
import sliit.construction.construction.repository.ProgressReportRepository;
import sliit.construction.construction.repository.ProjectRepository;
import sliit.construction.construction.repository.TaskAssignmentRepository;
import sliit.construction.construction.repository.TaskRepository;
import sliit.construction.construction.repository.UserRepository;
import sliit.construction.construction.exception.DuplicateResourceException;
import sliit.construction.construction.exception.ResourceNotFoundException;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service("userService")
public class UserServiceImpl implements UserService {

	private final UserRepository repo;
	private final PasswordEncoder encoder;
	private final ProjectRepository projectRepository;
	private final TaskRepository taskRepository;
	private final TaskAssignmentRepository taskAssignmentRepository;
	private final DocumentRepository documentRepository;
	private final ProgressReportRepository progressReportRepository;
	private final ProgressIssueRepository progressIssueRepository;
	private final NotificationRepository notificationRepository;
	private final ClientProjectRequestRepository clientProjectRequestRepository;

	@Autowired
	public UserServiceImpl(
			UserRepository repo,
			PasswordEncoder encoder,
			ProjectRepository projectRepository,
			TaskRepository taskRepository,
			TaskAssignmentRepository taskAssignmentRepository,
			DocumentRepository documentRepository,
			ProgressReportRepository progressReportRepository,
			ProgressIssueRepository progressIssueRepository,
			NotificationRepository notificationRepository,
			ClientProjectRequestRepository clientProjectRequestRepository
	) {
		this.repo = repo;
		this.encoder = encoder;
		this.projectRepository = projectRepository;
		this.taskRepository = taskRepository;
		this.taskAssignmentRepository = taskAssignmentRepository;
		this.documentRepository = documentRepository;
		this.progressReportRepository = progressReportRepository;
		this.progressIssueRepository = progressIssueRepository;
		this.notificationRepository = notificationRepository;
		this.clientProjectRequestRepository = clientProjectRequestRepository;
	}

	public UserServiceImpl(
			UserRepository repo,
			PasswordEncoder encoder
	) {
		this(repo, encoder, null, null, null, null, null, null, null, null);
	}


 // =========================================================
 // CREATE USER
 // =========================================================

 @Override
 public UserDtos.Response create(
         UserDtos.Request r
 ) {

  if (r.password() == null || r.password().isBlank()) {
   throw new IllegalArgumentException("Password is required when creating a new user account.");
  }

  if (r.password().length() < 8) {
   throw new IllegalArgumentException("Password must be at least 8 characters long.");
  }

  if (repo.existsByUsername(
          r.username()
  )) {

   throw new DuplicateResourceException(
           "Username already exists: " + r.username()
   );
  }


  if (repo.existsByEmail(
          r.email()
  )) {

   throw new DuplicateResourceException(
           "Email already exists: " + r.email()
   );
  }


  User user =
          User.builder()

                  .username(
                          r.username().trim()
                  )

                  .email(
                          r.email().trim().toLowerCase()
                  )

                  .passwordHash(
                          encoder.encode(
                                  r.password()
                          )
                  )

                  .role(
                          r.role()
                  )

                  .fullName(
                          r.fullName().trim()
                  )

                  .phoneNumber(
                          r.phoneNumber() != null ? r.phoneNumber().trim() : null
                  )

                  .build();


  return map(
          repo.save(user)
  );
 }


 // =========================================================
 // GET ALL USERS (PAGINATED & SEARCHABLE)
 // =========================================================

 @Override
 public Page<UserDtos.Response> list(
         String search,
         Pageable pageable
 ) {
  return list(search, null, pageable);
 }

 @Override
 public Page<UserDtos.Response> list(
         String search,
         String role,
         Pageable pageable
 ) {
  boolean hasSearch = search != null && !search.isBlank();
  boolean hasRole = role != null && !role.isBlank() && !role.equalsIgnoreCase("ALL");

  if (hasRole) {
   try {
    Role roleEnum = Role.valueOf(role.trim().toUpperCase());
    if (hasSearch) {
     String q = search.trim();
     return repo.findByRoleAndUsernameContainingIgnoreCaseOrRoleAndFullNameContainingIgnoreCase(
             roleEnum, q, roleEnum, q, pageable
     ).map(this::map);
    }
    return repo.findByRole(roleEnum, pageable).map(this::map);
   } catch (IllegalArgumentException ignored) {
    // If not matching default enum, proceed to search
   }
  }

  if (hasSearch) {
   String q = search.trim();
   return repo.findByUsernameContainingIgnoreCaseOrFullNameContainingIgnoreCaseOrEmailContainingIgnoreCase(
           q, q, q, pageable
   ).map(this::map);
  }

  return repo.findAll(pageable).map(this::map);
 }

 // =========================================================
 // GET REAL-TIME USER METRICS / STATS
 // =========================================================
 @Override
 public java.util.Map<String, Object> getUserStats() {
  java.util.Map<String, Object> stats = new java.util.HashMap<>();
  stats.put("totalUsers", repo.count());
  stats.put("projectManagers", repo.countByRole(Role.PROJECT_MANAGER));
  stats.put("siteEngineers", repo.countByRole(Role.SITE_ENGINEER));
  stats.put("administrators", repo.countByRole(Role.SYSTEM_ADMINISTRATOR));
  stats.put("supervisors", repo.countByRole(Role.CONSTRUCTION_SUPERVISOR));
  stats.put("procurementOfficers", repo.countByRole(Role.PROCUREMENT_OFFICER));
  stats.put("clients", repo.countByRole(Role.CLIENT));
  stats.put("suppliers", repo.countByRole(Role.SUPPLIER));
  return stats;
 }


 // =========================================================
 // GET PROJECT MANAGERS
 // =========================================================

 @Override
 public Page<UserDtos.Response> getProjectManagers(
         Pageable pageable
 ) {

  return repo
          .findByRole(
                  Role.PROJECT_MANAGER,
                  pageable
          )
          .map(this::map);
 }


 // =========================================================
 // GET USER
 // =========================================================

 @Override
 public UserDtos.Response get(
         Long id
 ) {

  return map(
          getEntity(id)
  );
 }


 // =========================================================
 // UPDATE USER
 // =========================================================

 @Override
 @Transactional
 public UserDtos.Response update(
         Long id,
         UserDtos.Request r
 ) {

  User user = getEntity(id);

  String cleanUsername = r.username() != null ? r.username().trim() : "";
  if (cleanUsername.isBlank()) {
   throw new IllegalArgumentException("Username is required.");
  }

  // Check username uniqueness excluding this current user
  repo.findByUsername(cleanUsername)
          .filter(u -> !u.getId().equals(user.getId()))
          .ifPresent(u -> {
           throw new DuplicateResourceException("Username already exists: " + cleanUsername);
          });

  String cleanEmail = r.email() != null ? r.email().trim().toLowerCase() : "";
  if (cleanEmail.isBlank()) {
   throw new IllegalArgumentException("Email is required.");
  }

  // Check email uniqueness excluding this current user
  repo.findByEmail(cleanEmail)
          .filter(u -> !u.getId().equals(user.getId()))
          .ifPresent(u -> {
           throw new DuplicateResourceException("Email already exists: " + cleanEmail);
          });

  user.setUsername(cleanUsername);
  user.setEmail(cleanEmail);

  if (r.fullName() != null && !r.fullName().isBlank()) {
   user.setFullName(r.fullName().trim());
  }

  if (r.phoneNumber() != null && !r.phoneNumber().isBlank()) {
   user.setPhoneNumber(r.phoneNumber().trim());
  } else {
   user.setPhoneNumber(null);
  }

  if (r.role() != null) {
   user.setRole(r.role());
  }

  // Password is optional during update
  if (r.password() != null && !r.password().isBlank()) {
   if (r.password().length() < 8) {
    throw new IllegalArgumentException("New password must be at least 8 characters long.");
   }

   user.setPasswordHash(
           encoder.encode(
                   r.password()
           )
   );
  }

  return map(
          repo.save(user)
  );
 }


 // =========================================================
 // DELETE USER (CASCADE & REASSIGN FOREIGN REFERENCES)
 // =========================================================

 @Override
 @Transactional
 public void delete(
         Long id
 ) {
  User user = getEntity(id);

  // Find fallback admin or active administrator (excluding this user)
  User fallbackAdmin = null;
  Authentication auth = SecurityContextHolder.getContext().getAuthentication();
  if (auth != null && auth.getName() != null && !auth.getName().equalsIgnoreCase(user.getUsername())) {
   fallbackAdmin = repo.findByUsername(auth.getName()).orElse(null);
  }
  if (fallbackAdmin == null) {
   fallbackAdmin = repo.findByRole(Role.SYSTEM_ADMINISTRATOR).stream()
           .filter(u -> !u.getId().equals(user.getId()))
           .findFirst()
           .orElse(null);
  }
  if (fallbackAdmin == null) {
   fallbackAdmin = repo.findAll().stream()
           .filter(u -> !u.getId().equals(user.getId()))
           .findFirst()
           .orElse(null);
  }

  // 1. Reassign projects managed by this user
  if (projectRepository != null) {
   List<Project> managedProjects = projectRepository.findByManager(user);
   if (managedProjects != null && !managedProjects.isEmpty()) {
    for (Project p : managedProjects) {
     p.setManager(fallbackAdmin);
     projectRepository.save(p);
    }
   }
  }

  // 2. Reassign tasks assigned to this user
  if (taskRepository != null) {
   List<Task> assignedTasks = taskRepository.findByAssignee(user);
   if (assignedTasks != null && !assignedTasks.isEmpty()) {
    for (Task t : assignedTasks) {
     User targetAssignee = (t.getProject() != null && t.getProject().getManager() != null && !t.getProject().getManager().getId().equals(user.getId()))
             ? t.getProject().getManager()
             : fallbackAdmin;
     t.setAssignee(targetAssignee);
     taskRepository.save(t);
    }
   }
  }

  // 3. Delete task assignments for this user
  if (taskAssignmentRepository != null) {
   taskAssignmentRepository.deleteByStaff(user);
  }

  // 4. Reassign documents uploaded by this user
  if (documentRepository != null) {
   List<Document> uploadedDocs = documentRepository.findByUploadedBy(user);
   if (uploadedDocs != null && !uploadedDocs.isEmpty()) {
    for (Document doc : uploadedDocs) {
     doc.setUploadedBy(fallbackAdmin);
     documentRepository.save(doc);
    }
   }
  }

  // 5. Reassign progress reports created by this user
  if (progressReportRepository != null) {
   List<ProgressReport> reports = progressReportRepository.findByReportedBy(user);
   if (reports != null && !reports.isEmpty()) {
    for (ProgressReport rep : reports) {
     rep.setReportedBy(fallbackAdmin);
     progressReportRepository.save(rep);
    }
   }
  }

  // 6. Update progress issues reported by this user
  if (progressIssueRepository != null && fallbackAdmin != null) {
   List<ProgressIssue> issues = progressIssueRepository.findByReportedById(user.getId());
   if (issues != null && !issues.isEmpty()) {
    for (ProgressIssue issue : issues) {
     issue.setReportedById(fallbackAdmin.getId());
     progressIssueRepository.save(issue);
    }
   }
  }

  // 7. Delete notifications received by this user
  if (notificationRepository != null) {
   notificationRepository.deleteByRecipient(user);
  }

  // 8. Delete client project requests submitted by this client user
  if (clientProjectRequestRepository != null) {
   clientProjectRequestRepository.deleteByClient(user);
  }

  // 9. Delete the user
  repo.delete(user);
 }


 // =========================================================
 // GET USER ENTITY
 // =========================================================

 @Override
 public User getEntity(
         Long id
 ) {

  return repo
          .findById(id)
          .orElseThrow(
                  () ->
                          new ResourceNotFoundException(
                                  "User not found: " + id
                          )
          );
 }


 // =========================================================
 // GET USER BY USERNAME
 // =========================================================

 @Override
 public User getByUsername(
         String username
 ) {

  return repo
          .findByUsername(username)
          .orElseThrow(
                  () ->
                          new ResourceNotFoundException(
                                  "User not found"
                          )
          );
 }


 // =========================================================
 // GET USER BY USERNAME OR EMAIL
 // =========================================================

 @Override
 public User getByUsernameOrEmail(
         String identifier
 ) {
  return repo
          .findByUsernameOrEmail(identifier, identifier)
          .orElseThrow(
                  () ->
                          new ResourceNotFoundException(
                                  "User not found: " + identifier
                          )
          );
 }


 // =========================================================
 // CHANGE PASSWORD
 // =========================================================

 @Override
 public void changePassword(
         String username,
         String currentPassword,
         String newPassword,
         String confirmNewPassword
 ) {
  User user = repo.findByUsernameOrEmail(username, username)
          .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));

  if (!encoder.matches(currentPassword, user.getPasswordHash())) {
   throw new BadCredentialsException("Current password does not match our records.");
  }

  if (newPassword == null || newPassword.isBlank()) {
   throw new IllegalArgumentException("New password cannot be empty.");
  }

  if (!newPassword.equals(confirmNewPassword)) {
   throw new IllegalArgumentException("New password and confirmation password do not match.");
  }

  if (newPassword.length() < 8) {
   throw new IllegalArgumentException("New password must be at least 8 characters long.");
  }

  if (encoder.matches(newPassword, user.getPasswordHash())) {
   throw new IllegalArgumentException("New password cannot be the same as your current password.");
  }

  user.setPasswordHash(encoder.encode(newPassword));
  repo.save(user);
 }

 // =========================================================
 // STAFF PROFILE METHODS
 // =========================================================

 @Override
 @Transactional(readOnly = true)
 public UserDtos.Response getProfile(String username) {
  User user = getByUsernameOrEmail(username);
  return map(user);
 }

 @Override
 @Transactional
 public UserDtos.Response updateProfile(String currentUsername, UserDtos.ProfileUpdateRequest req) {
  User user = getByUsernameOrEmail(currentUsername);
  return update(user.getId(), new UserDtos.Request(
          req.username().trim(),
          req.email().trim(),
          req.password(),
          user.getRole(),
          req.fullName().trim(),
          req.phoneNumber() != null ? req.phoneNumber().trim() : null
  ));
 }

 @Override
 @Transactional
 public void deleteProfile(String currentUsername) {
  User user = getByUsernameOrEmail(currentUsername);
  delete(user.getId());
 }


 // =========================================================
 // ENTITY → DTO
 // =========================================================

 private UserDtos.Response map(
         User user
 ) {

  return new UserDtos.Response(

          user.getId(),

          user.getUsername(),

          user.getEmail(),

          user.getRole(),

          user.getFullName(),

          user.getPhoneNumber(),

          user.getCreatedAt(),

          user.getUpdatedAt()
  );
 }
}