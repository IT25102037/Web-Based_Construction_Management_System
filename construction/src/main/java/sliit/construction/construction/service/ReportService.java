package sliit.construction.construction.service;

import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sliit.construction.construction.entity.*;
import sliit.construction.construction.repository.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class ReportService {

    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final MaterialRepository materialRepository;
    private final MilestoneRepository milestoneRepository;
    private final SupplierRepository supplierRepository;
    private final DocumentRepository documentRepository;
    private final ProgressIssueRepository issueRepository;
    private final ProgressReportRepository progressReportRepository;
    private final UserRepository userRepository;

    public ReportService(ProjectRepository projectRepository,
                         TaskRepository taskRepository,
                         MaterialRepository materialRepository,
                         MilestoneRepository milestoneRepository,
                         SupplierRepository supplierRepository,
                         DocumentRepository documentRepository,
                         ProgressIssueRepository issueRepository,
                         ProgressReportRepository progressReportRepository,
                         UserRepository userRepository) {
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
        this.materialRepository = materialRepository;
        this.milestoneRepository = milestoneRepository;
        this.supplierRepository = supplierRepository;
        this.documentRepository = documentRepository;
        this.issueRepository = issueRepository;
        this.progressReportRepository = progressReportRepository;
        this.userRepository = userRepository;
    }

    public Map<String, Object> summary() {
        List<Project> projects = projectRepository.findAll();
        List<Task> tasks = taskRepository.findAll();
        List<Material> materials = materialRepository.findAll();
        List<Milestone> milestones = milestoneRepository.findAll();
        List<ProgressIssue> issues = issueRepository.findAll();

        long totalProjects = projects.size();
        long activeProjects = projects.stream().filter(p -> p.getStatus() == ProjectStatus.IN_PROGRESS).count();
        long completedProjects = projects.stream().filter(p -> p.getStatus() == ProjectStatus.COMPLETED).count();
        long plannedProjects = projects.stream().filter(p -> p.getStatus() == ProjectStatus.PLANNED).count();
        long onHoldProjects = projects.stream().filter(p -> p.getStatus() == ProjectStatus.ON_HOLD).count();

        BigDecimal totalBudget = projects.stream()
                .map(p -> p.getBudget() != null ? p.getBudget() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        long totalTasks = tasks.size();
        long completedTasks = tasks.stream().filter(t -> t.getStatus() == TaskStatus.COMPLETED).count();
        long inProgressTasks = tasks.stream().filter(t -> t.getStatus() == TaskStatus.IN_PROGRESS).count();
        long todoTasks = tasks.stream().filter(t -> t.getStatus() == TaskStatus.TODO).count();
        long blockedTasks = tasks.stream().filter(t -> t.getStatus() == TaskStatus.BLOCKED).count();
        long cancelledTasks = tasks.stream().filter(t -> t.getStatus() == TaskStatus.CANCELLED).count();
        double taskCompletionRate = totalTasks > 0 ? (completedTasks * 100.0) / totalTasks : 0.0;

        long totalMilestones = milestones.size();
        long completedMilestones = milestones.stream().filter(m -> m.getStatus() == MilestoneStatus.COMPLETED).count();

        long totalMaterials = materials.size();
        long outOfStockMaterials = 0;
        long lowStockMaterials = 0;
        BigDecimal totalInventoryValuation = BigDecimal.ZERO;

        for (Material m : materials) {
            BigDecimal qty = m.getQuantity() != null ? m.getQuantity() : BigDecimal.ZERO;
            BigDecimal threshold = m.getStockThreshold() != null ? m.getStockThreshold() : BigDecimal.ZERO;
            BigDecimal price = m.getUnitPrice() != null ? m.getUnitPrice() : BigDecimal.ZERO;

            if (qty.compareTo(BigDecimal.ZERO) <= 0) {
                outOfStockMaterials++;
            } else if (qty.compareTo(threshold) <= 0) {
                lowStockMaterials++;
            }

            BigDecimal itemTotal = qty.multiply(price);
            totalInventoryValuation = totalInventoryValuation.add(itemTotal);
        }

        long totalSuppliers = supplierRepository.count();
        long totalDocuments = documentRepository.count();
        long totalIssues = issues.size();
        long openIssues = issues.stream().filter(i -> i.getStatus() == IssueStatus.OPEN || i.getStatus() == IssueStatus.IN_PROGRESS).count();
        long criticalIssues = issues.stream().filter(i -> i.getSeverity() == IssueSeverity.CRITICAL && (i.getStatus() == IssueStatus.OPEN || i.getStatus() == IssueStatus.IN_PROGRESS)).count();
        long totalUsers = userRepository.count();

        Map<String, Object> map = new LinkedHashMap<>();
        map.put("totalProjects", totalProjects);
        map.put("activeProjects", activeProjects);
        map.put("completedProjects", completedProjects);
        map.put("plannedProjects", plannedProjects);
        map.put("onHoldProjects", onHoldProjects);
        map.put("totalBudget", totalBudget);

        map.put("totalTasks", totalTasks);
        map.put("completedTasks", completedTasks);
        map.put("inProgressTasks", inProgressTasks);
        map.put("todoTasks", todoTasks);
        map.put("pendingTasks", todoTasks);
        map.put("blockedTasks", blockedTasks);
        map.put("cancelledTasks", cancelledTasks);
        map.put("taskCompletionRate", Math.round(taskCompletionRate * 10.0) / 10.0);

        map.put("totalMilestones", totalMilestones);
        map.put("completedMilestones", completedMilestones);

        map.put("totalMaterials", totalMaterials);
        map.put("lowStockMaterials", lowStockMaterials);
        map.put("outOfStockMaterials", outOfStockMaterials);
        map.put("totalInventoryValuation", totalInventoryValuation.setScale(2, RoundingMode.HALF_UP));

        map.put("totalSuppliers", totalSuppliers);
        map.put("activeSuppliers", totalSuppliers);
        map.put("totalDocuments", totalDocuments);

        map.put("totalIssues", totalIssues);
        map.put("openIssues", openIssues);
        map.put("criticalIssues", criticalIssues);
        map.put("totalUsers", totalUsers);

        return map;
    }

    public List<Map<String, Object>> getProjectsReport() {
        List<Project> projects = projectRepository.findAll();
        List<Task> allTasks = taskRepository.findAll();
        List<Milestone> allMilestones = milestoneRepository.findAll();

        return projects.stream().map(p -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", p.getId());
            row.put("name", p.getName());
            row.put("location", p.getLocation() != null ? p.getLocation() : "N/A");
            row.put("status", p.getStatus() != null ? p.getStatus().name() : "PLANNED");
            row.put("startDate", p.getStartDate());
            row.put("endDate", p.getEndDate());
            row.put("budget", p.getBudget() != null ? p.getBudget() : BigDecimal.ZERO);
            row.put("managerName", p.getManager() != null ? p.getManager().getFullName() : "Unassigned");

            long pTasks = allTasks.stream().filter(t -> t.getProject() != null && Objects.equals(t.getProject().getId(), p.getId())).count();
            long pDoneTasks = allTasks.stream().filter(t -> t.getProject() != null && Objects.equals(t.getProject().getId(), p.getId()) && t.getStatus() == TaskStatus.COMPLETED).count();
            double pTaskPct = pTasks > 0 ? (pDoneTasks * 100.0) / pTasks : 0.0;

            long pMilestones = allMilestones.stream().filter(m -> m.getProject() != null && Objects.equals(m.getProject().getId(), p.getId())).count();
            long pDoneMilestones = allMilestones.stream().filter(m -> m.getProject() != null && Objects.equals(m.getProject().getId(), p.getId()) && m.getStatus() == MilestoneStatus.COMPLETED).count();

            row.put("totalTasks", pTasks);
            row.put("completedTasks", pDoneTasks);
            row.put("progressPercentage", Math.round(pTaskPct));
            row.put("totalMilestones", pMilestones);
            row.put("completedMilestones", pDoneMilestones);

            return row;
        }).collect(Collectors.toList());
    }

    public List<Map<String, Object>> getInventoryReport() {
        List<Material> list = materialRepository.findAll();

        return list.stream().map(m -> {
            Map<String, Object> row = new LinkedHashMap<>();
            BigDecimal qty = m.getQuantity() != null ? m.getQuantity() : BigDecimal.ZERO;
            BigDecimal threshold = m.getStockThreshold() != null ? m.getStockThreshold() : BigDecimal.ZERO;
            BigDecimal price = m.getUnitPrice() != null ? m.getUnitPrice() : BigDecimal.ZERO;
            BigDecimal val = qty.multiply(price);

            String health = "IN_STOCK";
            if (qty.compareTo(BigDecimal.ZERO) <= 0) {
                health = "OUT_OF_STOCK";
            } else if (qty.compareTo(threshold) <= 0) {
                health = "LOW_STOCK";
            }

            row.put("id", m.getId());
            row.put("code", m.getCode() != null ? m.getCode() : "MAT-" + m.getId());
            row.put("name", m.getName());
            row.put("category", m.getCategory() != null ? m.getCategory() : "General");
            row.put("quantity", qty);
            row.put("unit", m.getUnit() != null ? m.getUnit() : "Units");
            row.put("unitPrice", price);
            row.put("stockThreshold", threshold);
            row.put("totalValuation", val.setScale(2, RoundingMode.HALF_UP));
            row.put("healthStatus", health);
            row.put("supplier", m.getSupplier() != null ? m.getSupplier() : "N/A");

            return row;
        }).collect(Collectors.toList());
    }

    public List<Map<String, Object>> getTasksReport(Long projectId) {
        List<Task> list = projectId != null
                ? taskRepository.findByProjectId(projectId, Pageable.unpaged()).getContent()
                : taskRepository.findAll();

        return list.stream().map(t -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", t.getId());
            row.put("title", t.getTitle());
            row.put("projectName", t.getProject() != null ? t.getProject().getName() : "Unknown");
            row.put("priority", t.getPriority() != null ? t.getPriority().name() : "MEDIUM");
            row.put("status", t.getStatus() != null ? t.getStatus().name() : "TODO");
            row.put("assignedToName", t.getAssignee() != null ? t.getAssignee().getFullName() : "Unassigned");
            row.put("dueDate", t.getDeadline());
            return row;
        }).collect(Collectors.toList());
    }

    public List<Map<String, Object>> getIssuesReport(Long projectId) {
        List<ProgressIssue> list = projectId != null
                ? issueRepository.findByProjectId(projectId, Pageable.unpaged()).getContent()
                : issueRepository.findAll();

        Map<Long, String> projectMap = projectRepository.findAll().stream()
                .collect(Collectors.toMap(Project::getId, Project::getName, (a, b) -> a));
        Map<Long, String> userMap = userRepository.findAll().stream()
                .collect(Collectors.toMap(User::getId, User::getFullName, (a, b) -> a));

        return list.stream().map(i -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", i.getId());
            row.put("issueTitle", i.getIssueTitle());
            row.put("projectName", projectMap.getOrDefault(i.getProjectId(), "Project #" + i.getProjectId()));
            row.put("severity", i.getSeverity() != null ? i.getSeverity().name() : "MEDIUM");
            row.put("status", i.getStatus() != null ? i.getStatus().name() : "OPEN");
            row.put("reportedByName", userMap.getOrDefault(i.getReportedById(), "Staff"));
            row.put("createdAt", i.getCreatedAt());
            return row;
        }).collect(Collectors.toList());
    }

    public String generateCsv(String type) {
        StringBuilder csv = new StringBuilder();
        if ("inventory".equalsIgnoreCase(type)) {
            List<Map<String, Object>> list = getInventoryReport();
            csv.append("Item Code,Material Name,Category,Quantity,Unit,Unit Price,Threshold,Total Valuation,Health Status,Supplier\n");
            for (Map<String, Object> r : list) {
                csv.append(String.format("\"%s\",\"%s\",\"%s\",%s,\"%s\",%s,%s,%s,\"%s\",\"%s\"\n",
                        r.get("code"), r.get("name"), r.get("category"), r.get("quantity"), r.get("unit"),
                        r.get("unitPrice"), r.get("stockThreshold"), r.get("totalValuation"), r.get("healthStatus"), r.get("supplier")));
            }
        } else if ("tasks".equalsIgnoreCase(type)) {
            List<Map<String, Object>> list = getTasksReport(null);
            csv.append("Task ID,Title,Project,Priority,Status,Assigned To,Due Date\n");
            for (Map<String, Object> r : list) {
                csv.append(String.format("%s,\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\"\n",
                        r.get("id"), r.get("title"), r.get("projectName"), r.get("priority"), r.get("status"),
                        r.get("assignedToName"), r.get("dueDate")));
            }
        } else if ("issues".equalsIgnoreCase(type)) {
            List<Map<String, Object>> list = getIssuesReport(null);
            csv.append("Issue ID,Title,Project,Severity,Status,Reported By,Created Date\n");
            for (Map<String, Object> r : list) {
                csv.append(String.format("%s,\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",\"%s\"\n",
                        r.get("id"), r.get("issueTitle"), r.get("projectName"), r.get("severity"), r.get("status"),
                        r.get("reportedByName"), r.get("createdAt")));
            }
        } else {
            // Default: projects
            List<Map<String, Object>> list = getProjectsReport();
            csv.append("Project ID,Project Name,Location,Status,Start Date,End Date,Budget,Manager,Tasks,Completed Tasks,Progress %\n");
            for (Map<String, Object> r : list) {
                csv.append(String.format("%s,\"%s\",\"%s\",\"%s\",\"%s\",\"%s\",%s,\"%s\",%s,%s,%s%%\n",
                        r.get("id"), r.get("name"), r.get("location"), r.get("status"), r.get("startDate"),
                        r.get("endDate"), r.get("budget"), r.get("managerName"), r.get("totalTasks"),
                        r.get("completedTasks"), r.get("progressPercentage")));
            }
        }
        return csv.toString();
    }
}
