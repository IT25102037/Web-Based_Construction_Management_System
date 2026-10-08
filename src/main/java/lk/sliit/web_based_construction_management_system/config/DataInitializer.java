package lk.sliit.web_based_construction_management_system.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import sliit.construction.construction.entity.*;
import sliit.construction.construction.repository.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.Set;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner createStaffUsers(
            UserRepository userRepository,
            ProjectRepository projectRepository,
            RoleRepository roleRepository,
            SystemSettingRepository systemSettingRepository,
            DocumentRepository documentRepository,
            NotificationRepository notificationRepository
    ) {

        return args -> {

            // ==========================================
            // 0. SEED SYSTEM ROLES & PERMISSIONS
            // ==========================================
            seedInitialRoles(roleRepository);

            // ==========================================
            // 0.1 SEED DEFAULT SYSTEM SETTINGS
            // ==========================================
            seedInitialSettings(systemSettingRepository);

            BCryptPasswordEncoder encoder =
                    new BCryptPasswordEncoder();


            // ==========================================
            // 1. PROJECT MANAGER (Unique Credentials)
            // ==========================================
            createOrUpdateUser(
                    userRepository,
                    encoder,
                    "projectmanager",
                    "projectmanager@wbcms.com",
                    "Pm#2026Secure!",
                    Role.PROJECT_MANAGER,
                    "David Miller (PM)"
            );

            // ==========================================
            // 2. SITE ENGINEER (Unique Credentials)
            // ==========================================
            createOrUpdateUser(
                    userRepository,
                    encoder,
                    "siteengineer",
                    "siteengineer@wbcms.com",
                    "SiteEng#2026Pass!",
                    Role.SITE_ENGINEER,
                    "Sarah Jenkins (Site Eng)"
            );

            // ==========================================
            // 3. CONSTRUCTION SUPERVISOR (Unique Credentials)
            // ==========================================
            createOrUpdateUser(
                    userRepository,
                    encoder,
                    "supervisor",
                    "supervisor@wbcms.com",
                    "Superv#2026Pass!",
                    Role.CONSTRUCTION_SUPERVISOR,
                    "Michael Chang (Supervisor)"
            );

            // ==========================================
            // 4. PROCUREMENT OFFICER (Unique Credentials)
            // ==========================================
            createOrUpdateUser(
                    userRepository,
                    encoder,
                    "procurement",
                    "procurement@wbcms.com",
                    "Procur#2026Pass!",
                    Role.PROCUREMENT_OFFICER,
                    "Elena Rostova (Procurement)"
            );

            // ==========================================
            // 5. SYSTEM ADMINISTRATOR (Unique Credentials)
            // ==========================================
            createOrUpdateUser(
                    userRepository,
                    encoder,
                    "admin",
                    "admin@wbcms.com",
                    "Admin#2026Master!",
                    Role.SYSTEM_ADMINISTRATOR,
                    "System Administrator"
            );

            // ==========================================
            // 6. CLIENT ACCOUNT (Unique Credentials)
            // ==========================================
            createOrUpdateUser(
                    userRepository,
                    encoder,
                    "client",
                    "client@wbcms.com",
                    "Client#2026Pass!",
                    Role.CLIENT,
                    "Apex Towers Client"
            );

            // ==========================================
            // 7. INITIAL PROJECTS (For Project Manager)
            // ==========================================
            User pmUser = userRepository.findByUsername("projectmanager").orElse(null);
            if (pmUser != null && projectRepository.count() == 0) {
                Project p1 = Project.builder()
                        .name("Colombo Financial Center - Tower B")
                        .description("High-rise commercial tower featuring 32 floors, subterranean parking, grade-A corporate offices, and eco-certified glass curtain facade.")
                        .location("Galle Road, Colombo 03, Sri Lanka")
                        .startDate(LocalDate.now().minusMonths(6))
                        .endDate(LocalDate.now().plusMonths(18))
                        .budget(BigDecimal.valueOf(145000000.00))
                        .resourceAllocation("2 Tower Cranes, 4 Concrete Pumps, 150 Structural Tradesmen, 4 Site Engineers")
                        .status(ProjectStatus.IN_PROGRESS)
                        .manager(pmUser)
                        .build();

                Project p2 = Project.builder()
                        .name("Kandy Hillside Luxury Residential Resort")
                        .description("Gated luxury residential enclave comprising 24 eco-villas with retaining walls, infinity edge hydro-systems, and native timber framing.")
                        .location("Peradeniya Road, Kandy, Sri Lanka")
                        .startDate(LocalDate.now().minusMonths(2))
                        .endDate(LocalDate.now().plusMonths(10))
                        .budget(BigDecimal.valueOf(82000000.00))
                        .resourceAllocation("Earthmoving Excavators, Soil Stabilization Rigs, 65 Skilled Masons")
                        .status(ProjectStatus.IN_PROGRESS)
                        .manager(pmUser)
                        .build();

                Project p3 = Project.builder()
                        .name("Galle Heritage Marina & Boardwalk")
                        .description("Waterfront revitalization development with maritime promenade, retail boardwalk, breakwater reinforcement, and pedestrian lighting.")
                        .location("Marine Drive, Galle, Sri Lanka")
                        .startDate(LocalDate.now().plusMonths(1))
                        .endDate(LocalDate.now().plusMonths(14))
                        .budget(BigDecimal.valueOf(55000000.00))
                        .resourceAllocation("Barge Cranes, Marine Piling Gear, Pre-cast Concrete Units")
                        .status(ProjectStatus.PLANNED)
                        .manager(pmUser)
                        .build();

                Project p4 = Project.builder()
                        .name("Negombo Logistics Freight & Distribution Hub")
                        .description("Cold-storage warehousing and automated distribution facility with heavy vehicle asphalt aprons and automated loading docks.")
                        .location("Katunayake Highway Junction, Negombo, Sri Lanka")
                        .startDate(LocalDate.now().minusMonths(14))
                        .endDate(LocalDate.now().minusMonths(1))
                        .actualEndDate(LocalDate.now().minusMonths(1))
                        .budget(BigDecimal.valueOf(38000000.00))
                        .resourceAllocation("Structural Steel Riggers, Flooring Laser-Screed Crews, MEP Technicians")
                        .status(ProjectStatus.COMPLETED)
                        .manager(pmUser)
                        .build();

                projectRepository.save(p1);
                projectRepository.save(p2);
                projectRepository.save(p3);
                projectRepository.save(p4);

                if (documentRepository.count() == 0) {
                    Document d1 = Document.builder()
                            .title("CFC Tower B - Ground Floor Structural Reinforcement & Foundation Plan")
                            .documentType("BLUEPRINT")
                            .fileUrl("https://example.com/vault/blueprints/cfc-tower-b-foundation.dwg")
                            .filePath("/vault/blueprints/cfc-tower-b-foundation.dwg")
                            .fileSize("18.5 MB")
                            .version("v2.4")
                            .description("Detailed structural reinforcement CAD blueprint covering bored piles, raft foundation, and subterranean shear walls.")
                            .project(p1)
                            .uploadedBy(pmUser)
                            .build();

                    Document d2 = Document.builder()
                            .title("Colombo Municipal Council High-Rise Building Construction Permit")
                            .documentType("PERMIT")
                            .fileUrl("https://example.com/vault/permits/cmc-clearance-cfc-2025.pdf")
                            .filePath("/vault/permits/cmc-clearance-cfc-2025.pdf")
                            .fileSize("3.2 MB")
                            .version("v1.0")
                            .description("Official statutory municipal council approval certificate and clearance permit for 32-story commercial superstructure.")
                            .project(p1)
                            .uploadedBy(pmUser)
                            .build();

                    Document d3 = Document.builder()
                            .title("Civil Superstructure & Curtain Wall Contractor Master Agreement")
                            .documentType("CONTRACT")
                            .fileUrl("https://example.com/vault/contracts/cfc-master-contractor-agreement.pdf")
                            .filePath("/vault/contracts/cfc-master-contractor-agreement.pdf")
                            .fileSize("6.8 MB")
                            .version("v1.0")
                            .description("Fully executed and signed master legal contract with civil works contractor, milestone retention terms, and penalty clauses.")
                            .project(p1)
                            .uploadedBy(pmUser)
                            .build();

                    Document d4 = Document.builder()
                            .title("Geotechnical Soil Core Stability & Borehole Load-Bearing Report")
                            .documentType("REPORT")
                            .fileUrl("https://example.com/vault/reports/cfc-geotechnical-borehole-report.pdf")
                            .filePath("/vault/reports/cfc-geotechnical-borehole-report.pdf")
                            .fileSize("4.1 MB")
                            .version("v1.2")
                            .description("Comprehensive geological analysis report, standard penetration test results, and water table hydrostatic survey.")
                            .project(p1)
                            .uploadedBy(pmUser)
                            .build();

                    Document d5 = Document.builder()
                            .title("Kandy Resort - Hillside Drainage & Gravity Retaining Wall Blueprint")
                            .documentType("BLUEPRINT")
                            .fileUrl("https://example.com/vault/blueprints/kandy-hillside-drainage.dwg")
                            .filePath("/vault/blueprints/kandy-hillside-drainage.dwg")
                            .fileSize("12.4 MB")
                            .version("v1.3")
                            .description("Architectural drawings and civil engineering layout for terraced storm runoff drainage and slope stabilization.")
                            .project(p2)
                            .uploadedBy(pmUser)
                            .build();

                    Document d6 = Document.builder()
                            .title("Ready-Mix Concrete Grade C35 Technical Material Specification")
                            .documentType("SPECIFICATION")
                            .fileUrl("https://example.com/vault/specs/concrete-c35-technical-spec.pdf")
                            .filePath("/vault/specs/concrete-c35-technical-spec.pdf")
                            .fileSize("1.5 MB")
                            .version("v1.0")
                            .description("BS-compliant laboratory specifications for slump test parameters, rapid chloride permeability, and curing cycles.")
                            .project(p2)
                            .uploadedBy(pmUser)
                            .build();

                    documentRepository.save(d1);
                    documentRepository.save(d2);
                    documentRepository.save(d3);
                    documentRepository.save(d4);
                    documentRepository.save(d5);
                    documentRepository.save(d6);
                }

                if (notificationRepository.count() == 0) {
                    Notification n1 = Notification.builder()
                            .title("Urgent: Foundation Concrete Slump Inspection")
                            .message("Colombo Financial Center Tower B foundation pour scheduled for 09:00 AM tomorrow. Structural inspection required.")
                            .type("TASK")
                            .readFlag(false)
                            .recipient(pmUser)
                            .build();

                    Notification n2 = Notification.builder()
                            .title("New Material Requisition #MR-2026-088")
                            .message("Sarah Jenkins submitted a request for 150 Metric Tons of Grade 500 High-Tensile Rebar for immediate procurement.")
                            .type("MATERIAL")
                            .readFlag(false)
                            .recipient(pmUser)
                            .build();

                    Notification n3 = Notification.builder()
                            .title("Building Approval Clearance Permit Uploaded")
                            .message("Colombo Municipal Council statutory clearance permit #2025-998 successfully recorded in Document Vault.")
                            .type("DOCUMENT")
                            .readFlag(true)
                            .recipient(pmUser)
                            .build();

                    Notification n4 = Notification.builder()
                            .title("Weather Alert: Heavy Monsoon Rains Expected")
                            .message("Met Department warning issued for Kandy & Western Province. Ensure storm runoff drainage pumps are primed.")
                            .type("SYSTEM")
                            .readFlag(false)
                            .recipient(pmUser)
                            .build();

                    notificationRepository.save(n1);
                    notificationRepository.save(n2);
                    notificationRepository.save(n3);
                    notificationRepository.save(n4);
                }
            }

            System.out.println();
            System.out.println("============================================================================");
            System.out.println("                  WBCMS REAL-WORLD AUTHENTICATION READY                     ");
            System.out.println("============================================================================");
            System.out.println("Project Manager        : projectmanager | projectmanager@wbcms.com -> Pm#2026Secure!");
            System.out.println("Site Engineer          : siteengineer   | siteengineer@wbcms.com   -> SiteEng#2026Pass!");
            System.out.println("Construction Supervisor: supervisor     | supervisor@wbcms.com     -> Superv#2026Pass!");
            System.out.println("Procurement Officer    : procurement    | procurement@wbcms.com    -> Procur#2026Pass!");
            System.out.println("System Administrator   : admin          | admin@wbcms.com          -> Admin#2026Master!");
            System.out.println("Client Portal Account  : client         | client@wbcms.com         -> Client#2026Pass!");
            System.out.println("============================================================================");
            System.out.println(" * Each account has its own unique, hashed password. One password will NOT work for another.");
            System.out.println(" * Users can sign in using either their unique Username OR their unique Email.");
            System.out.println("============================================================================");
            System.out.println();

        };
    }

    private void createOrUpdateUser(
            UserRepository userRepository,
            BCryptPasswordEncoder encoder,
            String username,
            String email,
            String password,
            Role role,
            String fullName
    ) {
        User user = userRepository.findByUsername(username)
                .or(() -> userRepository.findByEmail(email))
                .orElseGet(User::new);

        user.setUsername(username);
        user.setEmail(email);

        // Always store BCrypt hash
        user.setPasswordHash(encoder.encode(password));
        user.setRole(role);
        user.setFullName(fullName);
        if (user.getPhoneNumber() == null) {
            user.setPhoneNumber("+94 11 234 5678");
        }

        userRepository.save(user);
    }

    private void seedInitialRoles(RoleRepository roleRepository) {
        // 1. SYSTEM ADMINISTRATOR
        createOrUpdateRole(
                roleRepository,
                "SYSTEM_ADMINISTRATOR",
                "System Administrator",
                "ADMINISTRATION",
                "#f87171",
                "Master administrator with full uninhibited access across all WBCMS modules, security policies, and user accounts.",
                true,
                Set.of(
                        "PROJECT_VIEW", "PROJECT_CREATE", "PROJECT_EDIT", "PROJECT_DELETE", "PROJECT_ASSIGN",
                        "TASK_VIEW", "TASK_CREATE", "TASK_EDIT", "TASK_DELETE", "TASK_ASSIGN",
                        "MILESTONE_VIEW", "MILESTONE_CREATE", "MILESTONE_EDIT", "MILESTONE_DELETE",
                        "PROGRESS_VIEW", "PROGRESS_UPDATE", "PROGRESS_REPORT", "ISSUE_CREATE", "ISSUE_RESOLVE",
                        "MATERIAL_VIEW", "MATERIAL_CREATE", "MATERIAL_EDIT", "MATERIAL_DELETE", "STOCK_ADJUST",
                        "MATERIAL_REQUEST_VIEW", "MATERIAL_REQUEST_CREATE", "MATERIAL_REQUEST_APPROVE", "MATERIAL_REQUEST_REJECT",
                        "SUPPLIER_VIEW", "SUPPLIER_CREATE", "SUPPLIER_EDIT", "SUPPLIER_DELETE",
                        "DOCUMENT_VIEW", "DOCUMENT_UPLOAD", "DOCUMENT_DELETE",
                        "REPORT_VIEW", "REPORT_EXPORT",
                        "USER_VIEW", "USER_MANAGE", "ROLE_MANAGE", "SYSTEM_CONFIG"
                )
        );

        // 2. PROJECT MANAGER
        createOrUpdateRole(
                roleRepository,
                "PROJECT_MANAGER",
                "Project Manager",
                "MANAGEMENT",
                "#38bdf8",
                "Oversees project planning, milestone timelines, task scheduling, resource allocation, and progress reporting.",
                true,
                Set.of(
                        "PROJECT_VIEW", "PROJECT_CREATE", "PROJECT_EDIT", "PROJECT_ASSIGN",
                        "TASK_VIEW", "TASK_CREATE", "TASK_EDIT", "TASK_ASSIGN",
                        "MILESTONE_VIEW", "MILESTONE_CREATE", "MILESTONE_EDIT",
                        "PROGRESS_VIEW", "PROGRESS_REPORT", "ISSUE_CREATE", "ISSUE_RESOLVE",
                        "MATERIAL_VIEW", "MATERIAL_REQUEST_VIEW", "SUPPLIER_VIEW",
                        "DOCUMENT_VIEW", "DOCUMENT_UPLOAD",
                        "REPORT_VIEW", "REPORT_EXPORT", "USER_VIEW"
                )
        );

        // 3. SITE ENGINEER
        createOrUpdateRole(
                roleRepository,
                "SITE_ENGINEER",
                "Site Engineer",
                "ENGINEERING",
                "#34d399",
                "Coordinates daily on-site civil works, blueprints, milestone completions, and technical logs.",
                true,
                Set.of(
                        "PROJECT_VIEW", "TASK_VIEW", "TASK_CREATE", "TASK_EDIT",
                        "MILESTONE_VIEW", "MILESTONE_EDIT",
                        "PROGRESS_VIEW", "PROGRESS_UPDATE", "ISSUE_CREATE",
                        "MATERIAL_VIEW", "MATERIAL_REQUEST_VIEW", "MATERIAL_REQUEST_CREATE",
                        "DOCUMENT_VIEW", "DOCUMENT_UPLOAD", "REPORT_VIEW"
                )
        );

        // 4. CONSTRUCTION SUPERVISOR
        createOrUpdateRole(
                roleRepository,
                "CONSTRUCTION_SUPERVISOR",
                "Construction Supervisor",
                "OPERATIONS",
                "#a855f7",
                "Directs tradesmen teams, tracks shift progress updates, and flags field issues.",
                true,
                Set.of(
                        "PROJECT_VIEW", "TASK_VIEW", "TASK_EDIT",
                        "MILESTONE_VIEW", "PROGRESS_VIEW", "PROGRESS_UPDATE",
                        "ISSUE_CREATE", "MATERIAL_VIEW", "MATERIAL_REQUEST_CREATE",
                        "DOCUMENT_VIEW"
                )
        );

        // 5. PROCUREMENT OFFICER
        createOrUpdateRole(
                roleRepository,
                "PROCUREMENT_OFFICER",
                "Procurement Officer",
                "PROCUREMENT",
                "#fbbf24",
                "Manages stock inventory, material pricing, requisition approvals, and supplier relations.",
                true,
                Set.of(
                        "PROJECT_VIEW", "MATERIAL_VIEW", "MATERIAL_CREATE", "MATERIAL_EDIT", "MATERIAL_DELETE", "STOCK_ADJUST",
                        "MATERIAL_REQUEST_VIEW", "MATERIAL_REQUEST_APPROVE", "MATERIAL_REQUEST_REJECT",
                        "SUPPLIER_VIEW", "SUPPLIER_CREATE", "SUPPLIER_EDIT", "SUPPLIER_DELETE",
                        "DOCUMENT_VIEW", "REPORT_VIEW", "REPORT_EXPORT"
                )
        );

        // 6. CLIENT
        createOrUpdateRole(
                roleRepository,
                "CLIENT",
                "Client Account",
                "CLIENT",
                "#06b6d4",
                "Client stakeholder access to monitor project progress updates, milestones, and submit project requests.",
                true,
                Set.of(
                        "PROJECT_VIEW", "MILESTONE_VIEW", "PROGRESS_VIEW", "DOCUMENT_VIEW", "REPORT_VIEW"
                )
        );

        // 7. HEALTH & SAFETY OFFICER (Custom Role)
        createOrUpdateRole(
                roleRepository,
                "SAFETY_OFFICER",
                "Health & Safety Officer",
                "SAFETY_QUALITY",
                "#f97316",
                "Conducts site safety audits, logs hazard delays, and reviews structural compliance documentation.",
                false,
                Set.of(
                        "PROJECT_VIEW", "TASK_VIEW", "PROGRESS_VIEW", "PROGRESS_UPDATE",
                        "ISSUE_CREATE", "ISSUE_RESOLVE", "DOCUMENT_VIEW", "DOCUMENT_UPLOAD",
                        "REPORT_VIEW", "REPORT_EXPORT"
                )
        );

        // 8. QUALITY ASSURANCE INSPECTOR (Custom Role)
        createOrUpdateRole(
                roleRepository,
                "QUALITY_INSPECTOR",
                "Quality Assurance Inspector",
                "SAFETY_QUALITY",
                "#10b981",
                "Inspects material deliveries, verifies construction compliance with specs, and validates milestones.",
                false,
                Set.of(
                        "PROJECT_VIEW", "MILESTONE_VIEW", "PROGRESS_VIEW",
                        "ISSUE_CREATE", "ISSUE_RESOLVE", "MATERIAL_VIEW",
                        "SUPPLIER_VIEW", "DOCUMENT_VIEW", "DOCUMENT_UPLOAD", "REPORT_VIEW"
                )
        );
    }

    private void createOrUpdateRole(
            RoleRepository roleRepository,
            String roleCode,
            String roleName,
            String category,
            String color,
            String description,
            boolean isSystemRole,
            Set<String> permissions
    ) {
        RoleEntity role = roleRepository.findByRoleCodeIgnoreCase(roleCode)
                .orElseGet(RoleEntity::new);

        role.setRoleCode(roleCode);
        role.setRoleName(roleName);
        role.setCategory(category);
        role.setColor(color);
        role.setDescription(description);
        role.setIsSystemRole(isSystemRole);
        if (role.getPermissions() == null || role.getPermissions().isEmpty()) {
            role.setPermissions(new HashSet<>(permissions));
        } else {
            role.getPermissions().addAll(permissions);
        }

        roleRepository.save(role);
    }

    private void seedInitialSettings(SystemSettingRepository settingRepository) {
        createOrUpdateSetting(settingRepository, "COMPANY_NAME", "WBCMS Construction Partners Ltd.", "GENERAL", "Official registered enterprise contractor name displayed across reports and purchase orders.", "STRING", "ACTIVE");
        createOrUpdateSetting(settingRepository, "COMPANY_EMAIL", "info@wbcms-construction.com", "GENERAL", "Official enterprise corporate correspondence email.", "STRING", "ACTIVE");
        createOrUpdateSetting(settingRepository, "CONTRACTOR_LICENSE", "CIDA-SP-2024-8841", "GENERAL", "National construction authority license registration number.", "STRING", "ACTIVE");
        createOrUpdateSetting(settingRepository, "DEFAULT_CURRENCY", "USD", "GENERAL", "Default accounting and procurement reporting currency ($).", "STRING", "ACTIVE");

        createOrUpdateSetting(settingRepository, "STOCK_SAFETY_THRESHOLD", "25", "INVENTORY", "Default minimum safety stock quantity threshold across material items.", "NUMBER", "ACTIVE");
        createOrUpdateSetting(settingRepository, "PREFERRED_UNIT_SYSTEM", "METRIC", "INVENTORY", "Default engineering measurement unit system (METRIC / IMPERIAL).", "STRING", "ACTIVE");
        createOrUpdateSetting(settingRepository, "AUTO_STOCK_ALERT", "true", "INVENTORY", "Send automated alerts to procurement officers when stock reaches safety line.", "BOOLEAN", "ACTIVE");
        createOrUpdateSetting(settingRepository, "TWO_FACTOR_REQUISITION_APPROVAL", "true", "INVENTORY", "Require project lead co-authorization for requisitions over $5,000.", "BOOLEAN", "ACTIVE");

        createOrUpdateSetting(settingRepository, "SESSION_TIMEOUT_MINUTES", "60", "SECURITY", "Inactivity timeout duration in minutes before user session invalidation.", "NUMBER", "ACTIVE");
        createOrUpdateSetting(settingRepository, "PASSWORD_POLICY", "STRONG", "SECURITY", "Enterprise password complexity requirement: Minimum 8 characters, 1 digit, 1 symbol.", "STRING", "ACTIVE");
        createOrUpdateSetting(settingRepository, "AUDIT_LOGGING_ENABLED", "true", "SECURITY", "Maintain non-repudiation audit trails for all stock disbursements and deletions.", "BOOLEAN", "ACTIVE");

        createOrUpdateSetting(settingRepository, "DAILY_BACKUP_SCHEDULE", "03:00 UTC", "SYSTEM", "Automated SQL Server encrypted snapshot backup execution time.", "STRING", "ACTIVE");
        createOrUpdateSetting(settingRepository, "MAX_FILE_UPLOAD_MB", "25", "SYSTEM", "Maximum permissible blueprint and document attachment size in megabytes.", "NUMBER", "ACTIVE");
    }

    private void createOrUpdateSetting(
            SystemSettingRepository settingRepository,
            String key,
            String value,
            String category,
            String description,
            String dataType,
            String status
    ) {
        SystemSetting setting = settingRepository.findBySettingKeyIgnoreCase(key)
                .orElseGet(SystemSetting::new);

        setting.setSettingKey(key);
        if (setting.getSettingValue() == null) {
            setting.setSettingValue(value);
        }
        setting.setCategory(category);
        setting.setDescription(description);
        setting.setDataType(dataType);
        setting.setStatus(status);

        settingRepository.save(setting);
    }
}