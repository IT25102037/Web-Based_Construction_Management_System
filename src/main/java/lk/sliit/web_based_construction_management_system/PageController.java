package lk.sliit.web_based_construction_management_system;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PageController {

	@GetMapping("/")
	public String index() {
		return "forward:/index.html";
	}

	@GetMapping("/login")
	public String login() {
		return "forward:/staff-login.html";
	}

	@GetMapping("/staff-login")
	public String staffLogin() {
		return "forward:/staff-login.html";
	}

	@GetMapping("/dashboard")
	public String dashboard() {
		return "forward:/dashboard.html";
	}

	@GetMapping("/projects")
	public String projects() {
		return "forward:/projects.html";
	}

	@GetMapping("/project-manager-dashboard")
	public String projectManagerDashboard() {
		return "forward:/projects.html";
	}

	@GetMapping("/project-details")
	public String projectDetails() {
		return "forward:/projects.html";
	}

	@GetMapping("/tasks")
	public String tasks() {
		return "forward:/tasks.html";
	}

	@GetMapping("/progress")
	public String progress() {
		return "forward:/progress.html";
	}

	@GetMapping("/materials")
	public String materials() {
		return "forward:/material-inventory.html";
	}

	@GetMapping("/clients")
	public String clients() {
		return "forward:/client-project-requests.html";
	}

	@GetMapping("/users")
	public String users() {
		return "forward:/users.html";
	}

	@GetMapping("/documents")
	public String documents() {
		return "forward:/documents.html";
	}

	@GetMapping("/reports")
	public String reports() {
		return "forward:/reports.html";
	}

	@GetMapping("/notifications")
	public String notifications() {
		return "forward:/dashboard.html";
	}

	@GetMapping("/communication")
	public String communication() {
		return "forward:/dashboard.html";
	}

	@GetMapping("/activity-logs")
	public String activityLogs() {
		return "forward:/dashboard.html";
	}

	@GetMapping("/settings")
	public String settings() {
		return "forward:/settings.html";
	}

	@GetMapping("/milestones")
	public String milestones() {
		return "forward:/milestones.html";
	}

	@GetMapping("/task-assignments")
	public String taskAssignments() {
		return "forward:/task-assignments.html";
	}

	@GetMapping("/material-requests")
	public String materialRequests() {
		return "forward:/material-requests.html";
	}

	@GetMapping("/material-inventory")
	public String materialInventory() {
		return "forward:/material-inventory.html";
	}

	@GetMapping("/suppliers")
	public String suppliers() {
		return "forward:/suppliers.html";
	}

	@GetMapping("/client-login")
	public String clientLogin() {
		return "forward:/client-login.html";
	}

	@GetMapping("/client-register")
	public String clientRegister() {
		return "forward:/client-register.html";
	}

	@GetMapping("/client-dashboard")
	public String clientDashboard() {
		return "forward:/client-project-requests.html";
	}

	@GetMapping("/client-profile")
	public String clientProfile() {
		return "forward:/client-project-requests.html";
	}

	@GetMapping("/client-project-requests")
	public String clientProjectRequests() {
		return "forward:/client-project-requests.html";
	}

	@GetMapping("/roles")
	public String roles() {
		return "forward:/roles.html";
	}

	@GetMapping("/role-management")
	public String roleManagement() {
		return "forward:/roles.html";
	}
}
