/**
 * WBCMS - Supplier Dashboard & Material Request Integration
 * Real-time synchronization with SQL Server database via Spring Boot REST APIs
 */

const API_URL = "/api/material-requests";

let allRequestsList = [];
let currentTab = "ALL";
let activeDecisionRequestId = null;
let activeTargetStatus = "ACCEPTED";
let isSubmittingDecision = false;
let syncPollInterval = null;
let loadRequestsSeq = 0;

// ===============================
// AUTHENTICATION & HEADERS
// ===============================

const token = localStorage.getItem("wbcms_token");
const userType = localStorage.getItem("wbcms_user_type");

if (!token) {
    window.location.replace("/staff-login.html");
}

function getHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + (localStorage.getItem("wbcms_token") || token),
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache"
    };
}

// ===============================
// INITIALIZATION
// ===============================

document.addEventListener("DOMContentLoaded", () => {
    loadUserProfile();
    loadRequests();
    startLiveSync();

    const decisionForm = document.getElementById("decisionForm");
    if (decisionForm) {
        decisionForm.addEventListener("submit", submitDecision);
    }

    const searchInput = document.getElementById("searchInput");
    if (searchInput) {
        searchInput.addEventListener("input", debounce(() => {
            renderRequests();
        }, 200));
    }

    // Modal click-outside dismissal
    window.addEventListener("click", event => {
        if (event.target && event.target.classList.contains("modal-overlay")) {
            closeDecisionModal();
            closeViewModal();
        }
    });

    // Escape key dismissal
    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeDecisionModal();
            closeViewModal();
        }
    });
});

// Real-Time Background Synchronization every 4 seconds
function startLiveSync() {
    if (syncPollInterval) clearInterval(syncPollInterval);
    syncPollInterval = setInterval(() => {
        loadRequests(true);
    }, 4000);
}

// ===============================
// USER PROFILE
// ===============================

function loadUserProfile() {
    const username = localStorage.getItem("wbcms_username") || "Supplier";
    const fullName = localStorage.getItem("wbcms_full_name") || username;
    const role = localStorage.getItem("wbcms_role") || "SUPPLIER";

    const pName = document.getElementById("profileName");
    const pRole = document.getElementById("profileRole");
    const dName = document.getElementById("dropdownUserName");
    const initials = document.getElementById("avatarInitials");

    if (pName) pName.textContent = fullName;
    if (dName) dName.textContent = fullName;
    if (pRole) {
        pRole.textContent = role === "SUPPLIER"
            ? "Material Vendor"
            : role.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    }

    if (initials) {
        const parts = fullName.trim().split(/\s+/);
        initials.textContent = parts.length > 1
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : fullName.substring(0, 2).toUpperCase();
    }

    const defaultSupplierInput = document.getElementById("decisionSupplierName");
    if (defaultSupplierInput && !defaultSupplierInput.value) {
        defaultSupplierInput.value = fullName;
    }
}

// ===============================
// LOAD MATERIAL REQUESTS
// ===============================

async function loadRequests(isSilent = false) {
    const currentSeq = ++loadRequestsSeq;
    const tbody = document.getElementById("supplierTableBody");

    if (!isSilent && tbody && allRequestsList.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align:center; padding: 40px;">
                    <i class="bi bi-arrow-repeat spin" style="font-size: 24px; display: inline-block; color:var(--orange);"></i>
                    <p style="margin-top: 8px; color: #8a99ad;">Connecting to SQL Server and loading material requests...</p>
                </td>
            </tr>
        `;
    }

    try {
        const url = `${API_URL}?page=0&size=200&_t=${Date.now()}`;
        const response = await fetch(url, {
            headers: getHeaders(),
            cache: "no-store"
        });

        if (currentSeq !== loadRequestsSeq) return;

        if (response.status === 401 || response.status === 403) {
            showToast("Session expired. Please login again.", "error");
            setTimeout(() => {
                localStorage.removeItem("wbcms_token");
                window.location.replace("/staff-login.html");
            }, 1200);
            return;
        }

        if (!response.ok) {
            throw new Error(`Failed to load requests (HTTP ${response.status})`);
        }

        const data = await response.json();
        const loadedList = Array.isArray(data) ? data : (data.content || []);

        // Sort newest required date / ID first
        loadedList.sort((a, b) => {
            const timeA = new Date(a.requiredDate || 0).getTime();
            const timeB = new Date(b.requiredDate || 0).getTime();
            if (timeB !== timeA) return timeB - timeA;
            return (b.id || 0) - (a.id || 0);
        });

        // If silent sync detected new incoming request
        if (isSilent && allRequestsList.length > 0 && loadedList.length > allRequestsList.length) {
            const newCount = loadedList.length - allRequestsList.length;
            showToast(`${newCount} new material requisition(s) received from Procurement!`, "info");
        }

        allRequestsList = loadedList;

        updateStatistics();
        renderRequests();

    } catch (error) {
        if (currentSeq !== loadRequestsSeq) return;
        console.error("Load supplier requests error:", error);
        if (tbody && allRequestsList.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" style="text-align:center; padding: 35px; color:#ef4444;">
                        <i class="bi bi-exclamation-triangle" style="font-size:24px;"></i>
                        <p style="margin-top:8px;">${escapeHtml(error.message || "Failed to load material requests.")}</p>
                        <button type="button" class="action-button" style="margin-top:10px;" onclick="loadRequests()">Retry</button>
                    </td>
                </tr>
            `;
        }
    }
}

// ===============================
// RENDER REQUESTS TABLE
// ===============================

function renderRequests() {
    const tbody = document.getElementById("supplierTableBody");
    const emptyMessage = document.getElementById("emptyMessage");
    if (!tbody) return;

    const searchInput = document.getElementById("searchInput");
    const search = searchInput ? searchInput.value.toLowerCase().trim() : "";

    const filtered = allRequestsList.filter(request => {
        const text = [
            request.requestCode,
            request.materialName,
            request.projectName,
            request.requestedBy,
            request.supplierName,
            request.decisionRemarks,
            request.reason
        ].filter(Boolean).join(" ").toLowerCase();

        const matchSearch = !search || text.includes(search);

        const status = (request.status || "").toUpperCase();
        let matchTab = true;

        if (currentTab === "PENDING") {
            matchTab = (status === "PENDING");
        } else if (currentTab === "ACCEPTED") {
            matchTab = (status === "ACCEPTED" || status === "APPROVED");
        } else if (currentTab === "DECLINED") {
            matchTab = (status === "DECLINED" || status === "REJECTED");
        }

        return matchSearch && matchTab;
    });

    tbody.innerHTML = "";

    if (filtered.length === 0) {
        if (emptyMessage) emptyMessage.style.display = "block";
        return;
    }

    if (emptyMessage) emptyMessage.style.display = "none";

    filtered.forEach(request => {
        const row = document.createElement("tr");

        const statusUpper = (request.status || "").toUpperCase();
        const isPending = statusUpper === "PENDING";
        const isAccepted = statusUpper === "ACCEPTED" || statusUpper === "APPROVED";
        const isDeclined = statusUpper === "DECLINED" || statusUpper === "REJECTED";

        row.innerHTML = `
            <td>
                <span style="font-weight:700; color:var(--blue-primary, #1a56db); font-family:monospace; background:#eff6ff; padding:3px 8px; border-radius:6px; border:1px solid #dbeafe;">
                    ${escapeHtml(request.requestCode)}
                </span>
            </td>
            <td>
                <strong style="color:var(--text-title, #0f172a); font-weight:600;">
                    ${escapeHtml(request.materialName)}
                </strong>
                ${request.supplierName ? `<div style="font-size:11px; color:#64748b; margin-top:2px;"><i class="bi bi-tag"></i> For: ${escapeHtml(request.supplierName)}</div>` : ''}
            </td>
            <td>
                <span style="font-weight:700; font-size:13.5px; color:#0f172a;">${request.quantity}</span>
                <span style="font-size:12px; color:#64748b; font-weight:600;">${escapeHtml(request.unit)}</span>
            </td>
            <td>
                <span style="color:#334155; font-size:13px; display:inline-flex; align-items:center; gap:5px;">
                    <i class="bi bi-building" style="color:#64748b;"></i>${escapeHtml(request.projectName)}
                </span>
            </td>
            <td>
                <span style="color:#475569; font-size:13px;">
                    ${escapeHtml(request.requestedBy)}
                </span>
            </td>
            <td>
                <span style="color:#475569; font-size:12.5px; display:inline-flex; align-items:center; gap:4px;">
                    <i class="bi bi-calendar3" style="color:#64748b;"></i>${request.requiredDate || "-"}
                </span>
            </td>
            <td>
                <span class="status ${getStatusClass(request.status)}">
                    ${getStatusIcon(request.status)}
                    ${formatStatus(request.status)}
                </span>
            </td>
            <td>
                <div style="font-size:12px; color:#475569; max-width:220px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${escapeHtml(request.decisionRemarks || request.reason || '')}">
                    ${request.decisionRemarks ? escapeHtml(request.decisionRemarks) : (request.reason ? '<span style="color:#94a3b8;">Site: ' + escapeHtml(request.reason) + '</span>' : '<span style="color:#cbd5e1;">None</span>')}
                </div>
            </td>
            <td class="actions">
                ${isPending ? `
                    <button type="button" class="accept-btn" onclick="openDecisionModal(${request.id}, 'ACCEPTED')" title="Accept this Material Requisition">
                        <i class="bi bi-check-lg"></i> Accept
                    </button>
                    <button type="button" class="decline-btn" onclick="openDecisionModal(${request.id}, 'DECLINED')" title="Decline this Material Requisition">
                        <i class="bi bi-x-lg"></i> Decline
                    </button>
                ` : `
                    <button type="button" class="action-button" style="padding:4px 8px; font-size:11.5px;" onclick="openDecisionModal(${request.id}, '${request.status || 'PENDING'}')" title="Change Decision">
                        <i class="bi bi-arrow-repeat"></i> Modify
                    </button>
                `}
                <button type="button" class="view-btn" onclick="viewRequest(${request.id})" title="View Details">
                    <i class="bi bi-eye"></i> View
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });
}

// ===============================
// STATISTICS & TAB COUNTS
// ===============================

function updateStatistics() {
    const total = allRequestsList.length;
    const pending = allRequestsList.filter(r => (r.status || "").toUpperCase() === "PENDING").length;
    const accepted = allRequestsList.filter(r => {
        const s = (r.status || "").toUpperCase();
        return s === "ACCEPTED" || s === "APPROVED";
    }).length;
    const declined = allRequestsList.filter(r => {
        const s = (r.status || "").toUpperCase();
        return s === "DECLINED" || s === "REJECTED";
    }).length;

    const totalEl = document.getElementById("totalRequests");
    const pendingEl = document.getElementById("pendingRequests");
    const acceptedEl = document.getElementById("acceptedRequests");
    const declinedEl = document.getElementById("declinedRequests");

    if (totalEl) totalEl.textContent = total;
    if (pendingEl) pendingEl.textContent = pending;
    if (acceptedEl) acceptedEl.textContent = accepted;
    if (declinedEl) declinedEl.textContent = declined;

    // Tabs counts
    const tabAll = document.getElementById("tabCountAll");
    const tabPending = document.getElementById("tabCountPending");
    const tabAccepted = document.getElementById("tabCountAccepted");
    const tabDeclined = document.getElementById("tabCountDeclined");

    if (tabAll) tabAll.textContent = total;
    if (tabPending) tabPending.textContent = pending;
    if (tabAccepted) tabAccepted.textContent = accepted;
    if (tabDeclined) tabDeclined.textContent = declined;

    // Bell notification badge
    const notifBadge = document.getElementById("pendingNotifCount");
    if (notifBadge) {
        if (pending > 0) {
            notifBadge.textContent = pending;
            notifBadge.style.display = "inline-flex";
        } else {
            notifBadge.style.display = "none";
        }
    }
}

// ===============================
// TABS FILTER
// ===============================

function setTab(tab, btn) {
    currentTab = tab;
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");
    renderRequests();
}

// ===============================
// DECISION MODAL & ACTIONS
// ===============================

function openDecisionModal(id, targetStatus = "ACCEPTED") {
    const request = allRequestsList.find(r => r.id === id);
    if (!request) {
        showToast("Requisition not found.", "error");
        return;
    }

    activeDecisionRequestId = id;
    activeTargetStatus = targetStatus;

    document.getElementById("decisionReqId").value = id;
    document.getElementById("decisionTargetStatus").value = targetStatus;

    // Summary Card
    const codeEl = document.getElementById("summaryReqCode");
    const statusEl = document.getElementById("summaryReqStatus");
    const matEl = document.getElementById("summaryMaterial");
    const qtyEl = document.getElementById("summaryQuantity");
    const projEl = document.getElementById("summaryProject");
    const dateEl = document.getElementById("summaryDate");
    const reasonEl = document.getElementById("summaryReason");

    if (codeEl) codeEl.textContent = request.requestCode || `#${request.id}`;
    if (statusEl) {
        statusEl.className = `status ${getStatusClass(request.status)}`;
        statusEl.textContent = formatStatus(request.status);
    }
    if (matEl) matEl.textContent = request.materialName || "-";
    if (qtyEl) qtyEl.textContent = `${request.quantity} ${request.unit || ""}`;
    if (projEl) projEl.textContent = request.projectName || "-";
    if (dateEl) dateEl.textContent = request.requiredDate || "-";
    if (reasonEl) reasonEl.textContent = request.reason || "Not specified";

    // Pre-fill remarks and supplier name
    const supplierInput = document.getElementById("decisionSupplierName");
    const fullName = localStorage.getItem("wbcms_full_name") || localStorage.getItem("wbcms_username") || "Apex Supplier";
    if (supplierInput) {
        supplierInput.value = request.supplierName || fullName;
    }

    const remarksInput = document.getElementById("decisionRemarks");
    if (remarksInput) {
        if (request.decisionRemarks) {
            remarksInput.value = request.decisionRemarks;
        } else if (targetStatus === "ACCEPTED") {
            remarksInput.value = `Order accepted for delivery by ${request.requiredDate || 'site schedule'}. Batch confirmed.`;
        } else if (targetStatus === "DECLINED") {
            remarksInput.value = "Unable to fulfill requisition on the requested timeline due to supply constraints.";
        } else {
            remarksInput.value = "Requisition placed under pending review for schedule and capacity assessment.";
        }
    }

    selectDecision(targetStatus);

    const modal = document.getElementById("decisionModal");
    if (modal) modal.classList.add("show");
}

function selectDecision(status) {
    activeTargetStatus = status;
    document.getElementById("decisionTargetStatus").value = status;

    const btnAccept = document.getElementById("btnSelectAccept");
    const btnDecline = document.getElementById("btnSelectDecline");
    const btnPending = document.getElementById("btnSelectPending");
    const subBtn = document.getElementById("submitDecisionBtn");

    // Reset all selection buttons
    if (btnAccept) {
        btnAccept.style.border = "2px solid #e2e8f0";
        btnAccept.style.background = "#f8fafc";
        btnAccept.style.color = "#64748b";
    }
    if (btnDecline) {
        btnDecline.style.border = "2px solid #e2e8f0";
        btnDecline.style.background = "#f8fafc";
        btnDecline.style.color = "#64748b";
    }
    if (btnPending) {
        btnPending.style.border = "2px solid #e2e8f0";
        btnPending.style.background = "#f8fafc";
        btnPending.style.color = "#64748b";
    }

    if (status === "ACCEPTED") {
        if (btnAccept) {
            btnAccept.style.border = "2px solid #10b981";
            btnAccept.style.background = "#ecfdf5";
            btnAccept.style.color = "#047857";
        }
        if (subBtn) {
            subBtn.style.background = "#059669";
            subBtn.style.borderColor = "#059669";
            subBtn.innerHTML = '<i class="bi bi-check-circle-fill"></i> <span>Confirm Acceptance</span>';
        }
    } else if (status === "DECLINED") {
        if (btnDecline) {
            btnDecline.style.border = "2px solid #ef4444";
            btnDecline.style.background = "#fef2f2";
            btnDecline.style.color = "#b91c1c";
        }
        if (subBtn) {
            subBtn.style.background = "#dc2626";
            subBtn.style.borderColor = "#dc2626";
            subBtn.innerHTML = '<i class="bi bi-x-circle-fill"></i> <span>Confirm Decline</span>';
        }
    } else { // PENDING
        if (btnPending) {
            btnPending.style.border = "2px solid #f59e0b";
            btnPending.style.background = "#fffbeb";
            btnPending.style.color = "#b45309";
        }
        if (subBtn) {
            subBtn.style.background = "#d97706";
            subBtn.style.borderColor = "#d97706";
            subBtn.innerHTML = '<i class="bi bi-clock-history"></i> <span>Mark as Pending</span>';
        }
    }
}

function closeDecisionModal() {
    activeDecisionRequestId = null;
    const modal = document.getElementById("decisionModal");
    if (modal) modal.classList.remove("show");
}

async function submitDecision(event) {
    event.preventDefault();

    if (isSubmittingDecision || !activeDecisionRequestId) return;

    const id = activeDecisionRequestId;
    const targetStatus = activeTargetStatus || "ACCEPTED";
    const backendStatus = (targetStatus === "ACCEPTED" || targetStatus === "APPROVED")
        ? "APPROVED"
        : (targetStatus === "DECLINED" || targetStatus === "REJECTED")
            ? "REJECTED"
            : "PENDING";

    const remarks = document.getElementById("decisionRemarks").value.trim();
    const supplierName = document.getElementById("decisionSupplierName").value.trim();

    if (!remarks) {
        showToast("Please provide decision remarks / notes.", "error");
        return;
    }

    const subBtn = document.getElementById("submitDecisionBtn");
    const originalHtml = subBtn ? subBtn.innerHTML : "";
    if (subBtn) {
        subBtn.disabled = true;
        subBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> <span>Saving to SQL Server...</span>';
    }

    isSubmittingDecision = true;

    try {
        let updated = null;

        // 1. Attempt dedicated status endpoint (PATCH or PUT)
        try {
            let statusResp = await fetch(`${API_URL}/${id}/status`, {
                method: "PATCH",
                headers: getHeaders(),
                body: JSON.stringify({
                    status: backendStatus,
                    remarks: remarks,
                    supplierName: supplierName || null
                }),
                cache: "no-store"
            });

            if (!statusResp.ok && (statusResp.status === 404 || statusResp.status === 405 || statusResp.status === 500)) {
                // Try PUT /status
                statusResp = await fetch(`${API_URL}/${id}/status`, {
                    method: "PUT",
                    headers: getHeaders(),
                    body: JSON.stringify({
                        status: backendStatus,
                        remarks: remarks,
                        supplierName: supplierName || null
                    }),
                    cache: "no-store"
                });
            }

            if (statusResp.ok) {
                updated = await statusResp.json();
            }
        } catch (statusErr) {
            console.warn("Direct status endpoint error, attempting standard requisition update fallback:", statusErr);
        }

        // 2. Resilient Fallback: If status endpoint is not matched on running server, update via PUT /api/material-requests/{id}
        if (!updated) {
            let req = allRequestsList.find(r => r.id === Number(id));
            try {
                const getResp = await fetch(`${API_URL}/${id}?_t=${Date.now()}`, {
                    headers: getHeaders(),
                    cache: "no-store"
                });
                if (getResp.ok) {
                    req = await getResp.json();
                }
            } catch (ignored) {}

            if (!req) {
                throw new Error("Could not find material request record to update.");
            }

            const putPayload = {
                requestCode: req.requestCode,
                materialName: req.materialName,
                quantity: req.quantity,
                unit: req.unit,
                projectName: req.projectName,
                requestedBy: req.requestedBy,
                requiredDate: req.requiredDate,
                reason: remarks || req.reason,
                status: backendStatus,
                supplierName: supplierName || req.supplierName || null
            };

            const putResponse = await fetch(`${API_URL}/${id}`, {
                method: "PUT",
                headers: getHeaders(),
                body: JSON.stringify(putPayload),
                cache: "no-store"
            });

            if (!putResponse.ok) {
                const errData = await putResponse.text();
                throw new Error(`Failed to update status in SQL Server: ${errData}`);
            }

            updated = await putResponse.json();
        }

        // Immediate optimistic local update
        const idx = allRequestsList.findIndex(r => r.id === Number(id));
        if (idx !== -1) {
            allRequestsList[idx] = {
                ...allRequestsList[idx],
                ...updated,
                status: targetStatus,
                decisionRemarks: remarks,
                supplierName: supplierName || updated.supplierName
            };
        }

        updateStatistics();
        renderRequests();
        closeDecisionModal();

        const actionText = targetStatus === "ACCEPTED" 
            ? "ACCEPTED" 
            : targetStatus === "DECLINED" 
                ? "DECLINED" 
                : "PENDING REVIEW";
        showToast(`Material request #${updated.requestCode || id} marked as ${actionText}! SQL Server updated successfully.`, "success");

        // Verify and refresh from server in background
        await loadRequests(true);

    } catch (err) {
        console.error("Submit decision error:", err);
        showToast(err.message || "Failed to update decision.", "error");
    } finally {
        isSubmittingDecision = false;
        if (subBtn) {
            subBtn.disabled = false;
            subBtn.innerHTML = originalHtml;
        }
    }
}

// ===============================
// VIEW REQUISITION DETAILS
// ===============================

async function viewRequest(id) {
    let request = allRequestsList.find(r => r.id === id);

    try {
        const response = await fetch(`${API_URL}/${id}?_t=${Date.now()}`, {
            headers: getHeaders(),
            cache: "no-store"
        });
        if (response.ok) {
            request = await response.json();
            const idx = allRequestsList.findIndex(r => r.id === id);
            if (idx !== -1) allRequestsList[idx] = request;
        }
    } catch (_) {}

    if (!request) {
        showToast("Requisition details not found.", "error");
        return;
    }

    const codeEl = document.getElementById("viewReqCode");
    const statusEl = document.getElementById("viewReqStatus");
    const matEl = document.getElementById("viewReqMaterial");
    const qtyEl = document.getElementById("viewReqQuantity");
    const projEl = document.getElementById("viewReqProject");
    const reqByEl = document.getElementById("viewReqRequestedBy");
    const dateEl = document.getElementById("viewReqDate");
    const supplierEl = document.getElementById("viewReqSupplier");
    const reasonEl = document.getElementById("viewReqReason");

    const decisionBadge = document.getElementById("viewDetailDecisionBadge");
    const decisionBy = document.getElementById("viewDetailDecisionBy");
    const decisionDate = document.getElementById("viewDetailDecisionDate");
    const decisionRemarks = document.getElementById("viewDetailDecisionRemarks");
    const decideBtn = document.getElementById("viewModalDecideBtn");

    if (codeEl) codeEl.textContent = request.requestCode || `#${request.id}`;
    if (statusEl) {
        statusEl.innerHTML = `<span class="status ${getStatusClass(request.status)}">${formatStatus(request.status)}</span>`;
    }
    if (matEl) matEl.textContent = request.materialName || "-";
    if (qtyEl) qtyEl.textContent = `${request.quantity} ${request.unit || ""}`;
    if (projEl) projEl.textContent = request.projectName || "-";
    if (reqByEl) reqByEl.textContent = request.requestedBy || "-";
    if (dateEl) dateEl.textContent = request.requiredDate || "-";
    if (supplierEl) supplierEl.textContent = request.supplierName || "Open / Unassigned";
    if (reasonEl) reasonEl.textContent = request.reason || "No site purpose or remarks provided.";

    if (decisionBadge) {
        decisionBadge.className = `status ${getStatusClass(request.status)}`;
        decisionBadge.textContent = formatStatus(request.status);
    }
    if (decisionBy) decisionBy.textContent = request.decisionBy || request.supplierName || "Pending Review";
    if (decisionDate) decisionDate.textContent = request.decisionDate ? new Date(request.decisionDate).toLocaleString() : "Not decided yet";
    if (decisionRemarks) decisionRemarks.textContent = request.decisionRemarks || "No response remarks submitted.";

    if (decideBtn) {
        decideBtn.onclick = () => {
            closeViewModal();
            openDecisionModal(request.id, (request.status === "DECLINED" || request.status === "REJECTED") ? "ACCEPTED" : "ACCEPTED");
        };
    }

    const modal = document.getElementById("viewRequestModal");
    if (modal) modal.classList.add("show");
}

function closeViewModal() {
    const modal = document.getElementById("viewRequestModal");
    if (modal) modal.classList.remove("show");
}

// ===============================
// HELPERS & STATUS FORMATTING
// ===============================

function getStatusClass(status) {
    const s = String(status || "").toUpperCase();
    switch (s) {
        case "PENDING":
            return "pending";
        case "APPROVED":
        case "ACCEPTED":
            return "approved";
        case "REJECTED":
        case "DECLINED":
        case "CANCELLED":
            return "rejected";
        case "FULFILLED":
            return "fulfilled";
        default:
            return "pending";
    }
}

function formatStatus(status) {
    const s = String(status || "").toUpperCase();
    switch (s) {
        case "PENDING":
            return "Pending Review";
        case "ACCEPTED":
        case "APPROVED":
            return "Accepted";
        case "DECLINED":
        case "REJECTED":
            return "Declined";
        case "FULFILLED":
            return "Fulfilled";
        default:
            return s || "Pending Review";
    }
}

function getStatusIcon(status) {
    const s = String(status || "").toUpperCase();
    switch (s) {
        case "ACCEPTED":
        case "APPROVED":
            return '<i class="bi bi-check-circle-fill"></i>';
        case "DECLINED":
        case "REJECTED":
            return '<i class="bi bi-x-circle-fill"></i>';
        case "FULFILLED":
            return '<i class="bi bi-box2-heart-fill"></i>';
        default:
            return '<i class="bi bi-clock-history"></i>';
    }
}

function escapeHtml(value) {
    if (value === null || value === undefined) return "";
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    const msg = document.getElementById("toastMessage");
    if (!toast || !msg) return;

    msg.textContent = message;
    toast.className = `toast show ${type}`;

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
        toast.className = "toast";
    }, 3800);
}
