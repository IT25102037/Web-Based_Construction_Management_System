package sliit.construction.construction.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import sliit.construction.construction.service.ReportService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
public class ReportController {

    private final ReportService service;

    public ReportController(ReportService service) {
        this.service = service;
    }

    // =========================================================
    // OVERALL SYSTEM KPI SUMMARY
    // =========================================================
    @GetMapping("/summary")
    @PreAuthorize("""
            hasAnyRole(
                'PROJECT_MANAGER',
                'SITE_ENGINEER',
                'CONSTRUCTION_SUPERVISOR',
                'PROCUREMENT_OFFICER',
                'SYSTEM_ADMINISTRATOR'
            )
            """)
    public Map<String, Object> summary() {
        return service.summary();
    }

    // =========================================================
    // DETAILED PROJECT PORTFOLIO REPORT
    // =========================================================
    @GetMapping("/projects")
    @PreAuthorize("""
            hasAnyRole(
                'PROJECT_MANAGER',
                'SITE_ENGINEER',
                'CONSTRUCTION_SUPERVISOR',
                'PROCUREMENT_OFFICER',
                'SYSTEM_ADMINISTRATOR'
            )
            """)
    public List<Map<String, Object>> getProjectsReport() {
        return service.getProjectsReport();
    }

    // =========================================================
    // INVENTORY STOCK & VALUATION AUDIT REPORT
    // =========================================================
    @GetMapping("/inventory")
    @PreAuthorize("""
            hasAnyRole(
                'PROJECT_MANAGER',
                'SITE_ENGINEER',
                'CONSTRUCTION_SUPERVISOR',
                'PROCUREMENT_OFFICER',
                'SYSTEM_ADMINISTRATOR'
            )
            """)
    public List<Map<String, Object>> getInventoryReport() {
        return service.getInventoryReport();
    }

    // =========================================================
    // TASK EXECUTION TELEMETRY REPORT
    // =========================================================
    @GetMapping("/tasks")
    @PreAuthorize("""
            hasAnyRole(
                'PROJECT_MANAGER',
                'SITE_ENGINEER',
                'CONSTRUCTION_SUPERVISOR',
                'PROCUREMENT_OFFICER',
                'SYSTEM_ADMINISTRATOR'
            )
            """)
    public List<Map<String, Object>> getTasksReport(@RequestParam(required = false) Long projectId) {
        return service.getTasksReport(projectId);
    }

    // =========================================================
    // PROGRESS ISSUES & BLOCKERS REPORT
    // =========================================================
    @GetMapping("/issues")
    @PreAuthorize("""
            hasAnyRole(
                'PROJECT_MANAGER',
                'SITE_ENGINEER',
                'CONSTRUCTION_SUPERVISOR',
                'PROCUREMENT_OFFICER',
                'SYSTEM_ADMINISTRATOR'
            )
            """)
    public List<Map<String, Object>> getIssuesReport(@RequestParam(required = false) Long projectId) {
        return service.getIssuesReport(projectId);
    }

    // =========================================================
    // CSV EXPORT STREAM
    // =========================================================
    @GetMapping("/export/csv")
    @PreAuthorize("""
            hasAnyRole(
                'PROJECT_MANAGER',
                'SITE_ENGINEER',
                'CONSTRUCTION_SUPERVISOR',
                'PROCUREMENT_OFFICER',
                'SYSTEM_ADMINISTRATOR'
            )
            """)
    public ResponseEntity<byte[]> exportCsv(@RequestParam(defaultValue = "projects") String type) {
        String csvContent = service.generateCsv(type);
        String filename = "wbcms_report_" + type.toLowerCase() + "_" + System.currentTimeMillis() + ".csv";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csvContent.getBytes());
    }
}
