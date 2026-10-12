/* =========================================================
   WBCMS - EXECUTIVE REPORTS & ANALYTICS JAVASCRIPT
   Real Full-Stack Integration with Spring Boot & SQL Server
========================================================= */

const authToken = localStorage.getItem("wbcms_token");
const userType = localStorage.getItem("wbcms_user_type");
const username = localStorage.getItem("wbcms_username") || "Staff User";
const role = localStorage.getItem("wbcms_role") || localStorage.getItem("wbcms_staff_role") || "STAFF";

if (!authToken || userType === "CLIENT") {
    window.location.replace("/staff-login.html");
}

let rawProjects = [];
let rawInventory = [];
let rawTasks = [];
let rawIssues = [];
let currentActiveTab = "projects";

document.addEventListener("DOMContentLoaded", function () {
    loadUserInformation();
    loadReportData();
});

function loadUserInformation() {
    const pName = document.getElementById("profileName");
    const pRole = document.getElementById("profileRole");
    const dropName = document.getElementById("dropdownUserName");

    if (pName) pName.textContent = username;
    if (pRole) pRole.textContent = formatRole(role);
    if (dropName) dropName.textContent = username;
}

function formatRole(value) {
    if (!value) return "Staff";
    return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function getAuthHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + authToken
    };
}

async function loadReportData() {
    try {
        const [summaryRes, projRes, invRes, taskRes, issueRes] = await Promise.all([
            fetch("/api/reports/summary", { headers: getAuthHeaders() }),
            fetch("/api/reports/projects", { headers: getAuthHeaders() }),
            fetch("/api/reports/inventory", { headers: getAuthHeaders() }),
            fetch("/api/reports/tasks", { headers: getAuthHeaders() }),
            fetch("/api/reports/issues", { headers: getAuthHeaders() })
        ]);

        if (summaryRes.ok) {
            const summary = await summaryRes.json();
            renderSummaryCards(summary);
        }

        if (projRes.ok) {
            rawProjects = await projRes.json();
            populateProjectFilterOptions(rawProjects);
            renderProjectsTable(rawProjects);
        }

        if (invRes.ok) {
            rawInventory = await invRes.json();
            renderInventoryTable(rawInventory);
        }

        if (taskRes.ok) {
            rawTasks = await taskRes.json();
            renderTasksTable(rawTasks);
        }

        if (issueRes.ok) {
            rawIssues = await issueRes.json();
            renderIssuesTable(rawIssues);
        }

    } catch (error) {
        console.error("Report loading error:", error);
        showToast("Error loading analytics data: " + error.message, "error");
    }
}

function populateProjectFilterOptions(projects) {
    const sel = document.getElementById("reportProjectFilter");
    if (!sel) return;

    const currentVal = sel.value;
    sel.innerHTML = '<option value="ALL">All Construction Projects</option>';

    projects.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.name;
        sel.appendChild(opt);
    });

    if (currentVal) sel.value = currentVal;
}

function applyGlobalReportFilters() {
    filterProjectsTable();
    filterTasksTable();
    filterIssuesTable();
}

function getPeriodMinDate() {
    const period = document.getElementById("reportPeriodFilter")?.value || "ALL";
    const now = new Date();
    if (period === "THIS_MONTH") return new Date(now.getFullYear(), now.getMonth(), 1);
    if (period === "LAST_30") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (period === "QUARTER") return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    if (period === "YTD") return new Date(now.getFullYear(), 0, 1);
    return null;
}

function renderSummaryCards(s) {
    const totalProjects = s.totalProjects || 0;
    const activeProjects = s.activeProjects || 0;
    const totalBudget = Number(s.totalBudget || 0);

    const repProjects = document.getElementById("repProjects");
    const repBudget = document.getElementById("repBudget");
    if (repProjects) repProjects.textContent = `${activeProjects} / ${totalProjects}`;
    if (repBudget) repBudget.textContent = `$${totalBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Total Budget`;

    const totalTasks = s.totalTasks || 0;
    const completedTasks = s.completedTasks || 0;
    const taskRate = Number(s.taskCompletionRate || 0);
    const repTasks = document.getElementById("repTasks");
    const repTaskBar = document.getElementById("repTaskBar");

    if (repTasks) repTasks.textContent = `${taskRate}% (${completedTasks}/${totalTasks})`;
    if (repTaskBar) repTaskBar.style.width = `${Math.min(100, Math.max(0, taskRate))}%`;

    const valuation = Number(s.totalInventoryValuation || 0);
    const lowStock = s.lowStockMaterials || 0;
    const repValuation = document.getElementById("repValuation");
    const repLowStock = document.getElementById("repLowStock");

    if (repValuation) repValuation.textContent = `$${valuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    if (repLowStock) repLowStock.textContent = `${lowStock} Reorder Alert${lowStock === 1 ? '' : 's'}`;

    const suppCount = s.totalSuppliers || 0;
    const repSuppliers = document.getElementById("repSuppliers");
    if (repSuppliers) repSuppliers.textContent = `${suppCount}`;

    const openIssues = s.openIssues || 0;
    const criticalIssues = s.criticalIssues || 0;
    const repIssues = document.getElementById("repIssues");
    const repCritical = document.getElementById("repCriticalIssues");

    if (repIssues) repIssues.textContent = `${openIssues} Open`;
    if (repCritical) repCritical.textContent = `${criticalIssues} Critical Blocker${criticalIssues === 1 ? '' : 's'}`;

    const docCount = s.totalDocuments || 0;
    const repDocs = document.getElementById("repDocs");
    if (repDocs) repDocs.textContent = `${docCount} Files`;
}

function switchReportTab(tabName, btnEl) {
    currentActiveTab = tabName;
    document.querySelectorAll(".report-tab-btn").forEach(b => b.classList.remove("active"));
    if (btnEl) btnEl.classList.add("active");

    document.getElementById("tabProjectsSection").style.display = tabName === "projects" ? "block" : "none";
    document.getElementById("tabInventorySection").style.display = tabName === "inventory" ? "block" : "none";
    document.getElementById("tabTasksSection").style.display = tabName === "tasks" ? "block" : "none";
    document.getElementById("tabIssuesSection").style.display = tabName === "issues" ? "block" : "none";
}

function renderProjectsTable(projects) {
    const tbody = document.getElementById("repProjectsTable");
    if (!tbody) return;

    if (projects.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 25px; color:#8a99ad;">No project records found.</td></tr>';
        return;
    }

    tbody.innerHTML = "";
    projects.forEach((p, idx) => {
        const budget = Number(p.budget || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const start = p.startDate ? new Date(p.startDate).toLocaleDateString() : "TBD";
        const end = p.endDate ? new Date(p.endDate).toLocaleDateString() : "TBD";
        const pct = p.progressPercentage || 0;

        let statusClass = "in-stock";
        if (p.status === "PLANNED") statusClass = "low-stock";
        if (p.status === "ON_HOLD") statusClass = "out-stock";

        const row = document.createElement("tr");
        row.innerHTML = `
            <td style="color:#64748b; font-weight:600;">${idx + 1}</td>
            <td><strong style="color:#0f172a; font-size:13.5px;">${escapeHtml(p.name)}</strong></td>
            <td><span style="font-size:12.5px; color:#334155; font-weight:500;"><i class="bi bi-geo-alt" style="color:var(--orange);"></i> ${escapeHtml(p.location)}</span></td>
            <td><span class="status ${statusClass}">${escapeHtml(p.status)}</span></td>
            <td><small style="color:#475569; font-weight:500;">${escapeHtml(start)} &rarr; ${escapeHtml(end)}</small></td>
            <td><strong style="color:#0f172a; font-size:13px;">$${budget}</strong></td>
            <td><span style="font-size:12.5px; color:#334155; font-weight:500;"><i class="bi bi-person-check" style="color:#059669;"></i> ${escapeHtml(p.managerName)}</span></td>
            <td>
                <div style="display:flex; align-items:center; gap:8px;">
                    <div class="progress-bar-container" style="flex:1; margin-top:0;">
                        <div class="progress-bar-fill" style="width: ${pct}%;"></div>
                    </div>
                    <span style="font-size:11.5px; font-weight:700; color:#059669;">${pct}%</span>
                </div>
                <small style="color:#64748b; font-size:11px;">${p.completedTasks}/${p.totalTasks} Tasks Done</small>
            </td>
            <td>
                <span class="version-badge" style="background:#eff6ff; border-color:#bfdbfe; color:#1d4ed8; font-weight:700;">
                    <i class="bi bi-flag-fill"></i> ${p.completedMilestones}/${p.totalMilestones}
                </span>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function renderInventoryTable(materials) {
    const tbody = document.getElementById("repMaterialsTable");
    if (!tbody) return;

    if (materials.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding: 25px; color:#8a99ad;">No inventory records found.</td></tr>';
        return;
    }

    tbody.innerHTML = "";
    materials.forEach(m => {
        const qty = Number(m.quantity || 0);
        const threshold = Number(m.stockThreshold || 0);
        const price = Number(m.unitPrice || 0);
        const valuation = Number(m.totalValuation || 0);

        let statusBadge = `<span class="status in-stock">Healthy Stock</span>`;
        if (m.healthStatus === "OUT_OF_STOCK" || qty <= 0) {
            statusBadge = `<span class="status out-stock">Out of Stock</span>`;
        } else if (m.healthStatus === "LOW_STOCK" || qty <= threshold) {
            statusBadge = `<span class="status low-stock">Low Stock Alert</span>`;
        }

        const row = document.createElement("tr");
        row.innerHTML = `
            <td><code style="color:var(--orange); font-weight:700;">${escapeHtml(m.code)}</code></td>
            <td><strong style="color:#0f172a; font-size:13.5px;">${escapeHtml(m.name)}</strong></td>
            <td><span style="color:#334155; font-weight:500; font-size:12px;">${escapeHtml(m.category)}</span></td>
            <td><strong style="color:#0f172a; font-size:13px;">${qty.toLocaleString()} ${escapeHtml(m.unit)}</strong></td>
            <td><span style="color:#64748b; font-size:12px;">${threshold.toLocaleString()} ${escapeHtml(m.unit)}</span></td>
            <td><span style="color:#334155; font-weight:600;">$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></td>
            <td><strong style="color:#059669; font-weight:700;">$${valuation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
            <td><span style="color:#334155; font-size:12.5px; font-weight:500;"><i class="bi bi-truck" style="color:var(--orange);"></i> ${escapeHtml(m.supplier)}</span></td>
            <td>${statusBadge}</td>
        `;
        tbody.appendChild(row);
    });
}

function renderTasksTable(tasks) {
    const tbody = document.getElementById("repTasksTable");
    if (!tbody) return;

    if (tasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 25px; color:#8a99ad;">No task records found.</td></tr>';
        return;
    }

    tbody.innerHTML = "";
    tasks.forEach((t, idx) => {
        const priority = (t.priority || "MEDIUM").toLowerCase();
        const status = (t.status || "PENDING").toLowerCase();
        const dueDate = t.dueDate ? new Date(t.dueDate).toLocaleDateString() : "None";

        const row = document.createElement("tr");
        row.innerHTML = `
            <td style="color:#64748b; font-weight:600;">${idx + 1}</td>
            <td><strong style="color:#0f172a; font-size:13.5px;">${escapeHtml(t.title)}</strong></td>
            <td><span style="color:#334155; font-weight:500; font-size:12.5px;"><i class="bi bi-building" style="color:var(--orange);"></i> ${escapeHtml(t.projectName)}</span></td>
            <td><span class="badge-priority ${priority}">${escapeHtml(t.priority)}</span></td>
            <td><span class="badge-status ${status}">${escapeHtml(t.status)}</span></td>
            <td><span style="color:#334155; font-weight:500; font-size:12.5px;"><i class="bi bi-person-fill" style="color:#2563eb;"></i> ${escapeHtml(t.assignedToName)}</span></td>
            <td><small style="color:#0f172a; font-weight:600;">${escapeHtml(dueDate)}</small></td>
        `;
        tbody.appendChild(row);
    });
}

function renderIssuesTable(issues) {
    const tbody = document.getElementById("repIssuesTable");
    if (!tbody) return;

    if (issues.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 25px; color:#8a99ad;">No issue records found.</td></tr>';
        return;
    }

    tbody.innerHTML = "";
    issues.forEach((i, idx) => {
        const severity = (i.severity || "MEDIUM").toLowerCase();
        const status = (i.status || "OPEN").toLowerCase();
        const loggedDate = i.createdAt ? new Date(i.createdAt).toLocaleDateString() : "N/A";

        const row = document.createElement("tr");
        row.innerHTML = `
            <td style="color:#64748b; font-weight:600;">${idx + 1}</td>
            <td><strong style="color:#0f172a; font-size:13.5px;">${escapeHtml(i.issueTitle)}</strong></td>
            <td><span style="color:#334155; font-weight:500; font-size:12.5px;"><i class="bi bi-building" style="color:var(--orange);"></i> ${escapeHtml(i.projectName)}</span></td>
            <td><span class="badge-priority ${severity}">${escapeHtml(i.severity)}</span></td>
            <td><span class="badge-status ${status}">${escapeHtml(i.status)}</span></td>
            <td><span style="color:#334155; font-weight:500; font-size:12.5px;"><i class="bi bi-person-exclamation" style="color:#d97706;"></i> ${escapeHtml(i.reportedByName)}</span></td>
            <td><small style="color:#0f172a; font-weight:600;">${escapeHtml(loggedDate)}</small></td>
        `;
        tbody.appendChild(row);
    });
}

function filterProjectsTable() {
    const query = (document.getElementById("projectSearch")?.value || "").toLowerCase().trim();
    const projId = document.getElementById("reportProjectFilter")?.value || "ALL";
    const minDate = getPeriodMinDate();

    const filtered = rawProjects.filter(p => {
        const matchesProj = projId === "ALL" || String(p.id) === String(projId);
        let matchesDate = true;
        if (minDate && p.startDate) {
            matchesDate = new Date(p.startDate) >= minDate;
        }
        const matchesQuery = !query ||
            (p.name || "").toLowerCase().includes(query) ||
            (p.location || "").toLowerCase().includes(query) ||
            (p.status || "").toLowerCase().includes(query) ||
            (p.managerName || "").toLowerCase().includes(query);

        return matchesProj && matchesDate && matchesQuery;
    });
    renderProjectsTable(filtered);
}

function filterInventoryTable() {
    const query = (document.getElementById("inventorySearch")?.value || "").toLowerCase().trim();
    const filtered = rawInventory.filter(m =>
        (m.name || "").toLowerCase().includes(query) ||
        (m.code || "").toLowerCase().includes(query) ||
        (m.category || "").toLowerCase().includes(query) ||
        (m.supplier || "").toLowerCase().includes(query)
    );
    renderInventoryTable(filtered);
}

function filterTasksTable() {
    const query = (document.getElementById("tasksSearch")?.value || "").toLowerCase().trim();
    const projId = document.getElementById("reportProjectFilter")?.value || "ALL";
    const minDate = getPeriodMinDate();

    const filtered = rawTasks.filter(t => {
        const matchesProj = projId === "ALL" || String(t.projectId) === String(projId);
        let matchesDate = true;
        if (minDate && t.createdAt) {
            matchesDate = new Date(t.createdAt) >= minDate;
        }
        const matchesQuery = !query ||
            (t.title || "").toLowerCase().includes(query) ||
            (t.projectName || "").toLowerCase().includes(query) ||
            (t.priority || "").toLowerCase().includes(query) ||
            (t.assignedToName || "").toLowerCase().includes(query);

        return matchesProj && matchesDate && matchesQuery;
    });
    renderTasksTable(filtered);
}

function filterIssuesTable() {
    const query = (document.getElementById("issuesSearch")?.value || "").toLowerCase().trim();
    const projId = document.getElementById("reportProjectFilter")?.value || "ALL";
    const minDate = getPeriodMinDate();

    const filtered = rawIssues.filter(i => {
        const matchesProj = projId === "ALL" || String(i.projectId) === String(projId);
        let matchesDate = true;
        if (minDate && i.createdAt) {
            matchesDate = new Date(i.createdAt) >= minDate;
        }
        const matchesQuery = !query ||
            (i.issueTitle || "").toLowerCase().includes(query) ||
            (i.projectName || "").toLowerCase().includes(query) ||
            (i.severity || "").toLowerCase().includes(query) ||
            (i.reportedByName || "").toLowerCase().includes(query);

        return matchesProj && matchesDate && matchesQuery;
    });
    renderIssuesTable(filtered);
}

function exportCurrentReportCsv() {
    exportCsvByType(currentActiveTab);
}

async function exportCsvByType(type) {
    try {
        const res = await fetch(`/api/reports/export/csv?type=${type}`, {
            headers: getAuthHeaders()
        });

        if (!res.ok) {
            throw new Error("Failed to export CSV (" + res.status + ")");
        }

        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `wbcms_${type}_report_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        showToast(`Exported ${type.toUpperCase()} report successfully!`, "success");
    } catch (err) {
        console.error("Export error:", err);
        showToast("Error generating CSV: " + err.message, "error");
    }
}

function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toastMessage");
    const toastIcon = document.getElementById("toastIcon");
    if (!toast || !toastMessage) return;

    toastMessage.textContent = message;
    if (toastIcon) {
        toastIcon.className = type === "error" ? "bi bi-exclamation-octagon-fill" : "bi bi-check-circle-fill";
    }

    toast.className = `toast show ${type}`;
    setTimeout(() => { toast.className = "toast"; }, 4000);
}

function escapeHtml(text) {
    if (!text) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function logout() {
    if (confirm("Are you sure you want to logout?")) {
        localStorage.removeItem("wbcms_token");
        localStorage.removeItem("wbcms_user_type");
        localStorage.removeItem("wbcms_role");
        localStorage.removeItem("wbcms_username");
        localStorage.removeItem("wbcms_user");
        window.location.replace("/staff-login.html");
    }
}
