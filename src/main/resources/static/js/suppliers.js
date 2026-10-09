// ======================================================
// WBCMS - SUPPLIER MANAGEMENT
// Rich Dark Aesthetic with Advanced Filtering & Features
// ======================================================

const API_URL = "/api/suppliers";
const MATERIALS_API_URL = "/api/materials";

let allSuppliers = [];
let suppliers = [];
let materialsCache = [];

let currentTab = "all";
let currentPage = 1;
const pageSize = 10;
let activeDossierSupplier = null;

// ======================================================
// AUTHENTICATION
// ======================================================
const authToken = localStorage.getItem("wbcms_token");
const userType = localStorage.getItem("wbcms_user_type");

if (!authToken || userType !== "STAFF") {
    window.location.replace("/staff-login.html");
}

function getHeaders() {
    return {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + authToken
    };
}

// ======================================================
// INITIALIZATION
// ======================================================
document.addEventListener("DOMContentLoaded", () => {
    loadStaffProfile();
    setupEventListeners();
    loadSuppliers();
});

// ======================================================
// EVENT LISTENERS & SETUP
// ======================================================
function setupEventListeners() {
    const searchInput = document.getElementById("supplierSearch");
    if (searchInput) {
        searchInput.addEventListener("input", debounce(() => {
            currentPage = 1;
            applyFilters();
        }, 250));
    }

    // Modal close when clicking overlay
    window.addEventListener("click", (e) => {
        const supplierModal = document.getElementById("supplierModal");
        const viewModal = document.getElementById("viewSupplierModal");
        const inquiryModal = document.getElementById("inquiryModal");

        if (e.target === supplierModal) closeSupplierModal();
        if (e.target === viewModal) closeViewSupplierModal();
        if (e.target === inquiryModal) closeInquiryModal();
    });

    // Close profile dropdown when clicking outside
    document.addEventListener("click", (e) => {
        const profileCard = document.getElementById("profileCard");
        if (profileCard && !profileCard.contains(e.target)) {
            profileCard.classList.remove("open");
        }
    });
}

function debounce(func, delay) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => func(...args), delay);
    };
}

// ======================================================
// LOAD STAFF PROFILE
// ======================================================
function loadStaffProfile() {
    const username = localStorage.getItem("wbcms_username") || "Staff User";
    const role = localStorage.getItem("wbcms_role") || "STAFF";

    const profileName = document.getElementById("profileName");
    const profileRole = document.getElementById("profileRole");
    const dropdownUserName = document.getElementById("dropdownUserName");
    const avatarInitials = document.getElementById("avatarInitials");

    if (profileName) profileName.textContent = username;
    if (dropdownUserName) dropdownUserName.textContent = username;
    if (profileRole) profileRole.textContent = formatRole(role);

    if (avatarInitials && username) {
        const parts = username.trim().split(" ");
        avatarInitials.textContent = parts.length > 1
            ? (parts[0][0] + parts[1][0]).toUpperCase()
            : username.substring(0, 2).toUpperCase();
    }
}

function formatRole(role) {
    if (!role) return "Staff";
    return role.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

// ======================================================
// LOAD SUPPLIERS & MATERIALS (Live SQL Server Sync)
// ======================================================
async function loadSuppliers() {
    const tbody = document.getElementById("supplierTableBody");

    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align:center; padding:36px;">
                    <i class="bi bi-arrow-repeat" style="font-size:24px; animation:spin 1s linear infinite; display:inline-block; color:var(--orange);"></i>
                    <p style="margin-top:8px; color:#8a99ad;">Loading suppliers from SQL Server...</p>
                </td>
            </tr>
        `;
    }

    try {
        // Fetch suppliers
        const response = await fetch(`${API_URL}?page=0&size=500`, { headers: getHeaders() });
        if (!response.ok) throw new Error(await getApiError(response));
        const data = await response.json();
        allSuppliers = data.content || [];

        // Also fetch materials asynchronously for cross-referencing & linking
        try {
            const matResponse = await fetch(`${MATERIALS_API_URL}?page=0&size=500`, { headers: getHeaders() });
            if (matResponse.ok) {
                const matData = await matResponse.json();
                materialsCache = matData.content || [];
            }
        } catch (e) {
            console.warn("Could not cache materials for supplier cross-referencing:", e);
        }

        updateStatistics();
        populateInquirySupplierSelect();
        applyFilters();

    } catch (error) {
        console.error("Error loading suppliers:", error);
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align:center; padding:40px; color:#ef4444;">
                        <i class="bi bi-exclamation-triangle" style="font-size:35px;"></i>
                        <p style="margin:10px 0;">Failed to load suppliers: ${escapeHtml(error.message)}</p>
                        <button class="action-button primary" onclick="loadSuppliers()">
                            <i class="bi bi-arrow-clockwise"></i> Retry
                        </button>
                    </td>
                </tr>
            `;
        }
        showToast(error.message || "Failed to load suppliers.", "error");
    }
}

// ======================================================
// UPDATE STATISTICS & TAB COUNTERS
// ======================================================
function updateStatistics() {
    const total = allSuppliers.length;
    const active = allSuppliers.filter(s => s.status === "ACTIVE").length;
    const inactive = allSuppliers.filter(s => s.status === "INACTIVE").length;

    // Count distinct materials that have a supplier matching one of our active suppliers
    const linkedCount = materialsCache.filter(m => m.supplier && m.supplier.trim() !== "").length;

    // Update Top Stat Cards
    const totalEl = document.getElementById("totalSuppliers");
    const activeEl = document.getElementById("activeSuppliers");
    const pendingEl = document.getElementById("pendingOrders");
    const inactiveEl = document.getElementById("inactiveSuppliers");
    const linkedEl = document.getElementById("linkedMaterialsCount");

    if (totalEl) totalEl.textContent = total;
    if (activeEl) activeEl.textContent = active;
    if (pendingEl) pendingEl.textContent = inactive;
    if (inactiveEl) inactiveEl.textContent = inactive;
    if (linkedEl) linkedEl.textContent = linkedCount;

    // Update Filter Tab Badges
    const allCount = document.getElementById("allCount");
    const activeCount = document.getElementById("activeCount");
    const inactiveCount = document.getElementById("inactiveCount");

    if (allCount) allCount.textContent = total;
    if (activeCount) activeCount.textContent = active;
    if (inactiveCount) inactiveCount.textContent = inactive;
}

// ======================================================
// APPLY FILTERS, SEARCH, SORT & PAGINATION
// ======================================================
function applyFilters() {
    const search = (document.getElementById("supplierSearch")?.value || "").toLowerCase().trim();
    const statusSelect = document.getElementById("statusFilter")?.value || "";
    const sortSelect = document.getElementById("sortFilter")?.value || "newest";

    let filtered = allSuppliers.filter(supplier => {
        // Tab Filtering
        if (currentTab === "ACTIVE" && supplier.status !== "ACTIVE") return false;
        if (currentTab === "INACTIVE" && supplier.status !== "INACTIVE") return false;
        if (currentTab === "recent") {
            // Filter by recent (top 35% of IDs or created recently)
            const maxId = Math.max(...allSuppliers.map(s => s.id || 0), 0);
            if ((supplier.id || 0) < maxId - 8 && allSuppliers.length > 8) return false;
        }
        if (currentTab === "with_email" && (!supplier.email || !supplier.email.trim())) return false;

        // Status Dropdown Filter
        if (statusSelect && supplier.status !== statusSelect) return false;

        // Search Input Filter
        if (search) {
            const name = (supplier.name || "").toLowerCase();
            const contact = (supplier.contactPerson || "").toLowerCase();
            const phone = (supplier.phone || "").toLowerCase();
            const email = (supplier.email || "").toLowerCase();
            const address = (supplier.address || "").toLowerCase();

            const match = name.includes(search) ||
                          contact.includes(search) ||
                          phone.includes(search) ||
                          email.includes(search) ||
                          address.includes(search);
            if (!match) return false;
        }

        return true;
    });

    // Sorting
    filtered.sort((a, b) => {
        if (sortSelect === "name_asc") {
            return (a.name || "").localeCompare(b.name || "");
        }
        if (sortSelect === "name_desc") {
            return (b.name || "").localeCompare(a.name || "");
        }
        if (sortSelect === "oldest") {
            return (a.id || 0) - (b.id || 0);
        }
        // newest (default)
        return (b.id || 0) - (a.id || 0);
    });

    suppliers = filtered;

    // Pagination calculations
    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    if (currentPage > totalPages) currentPage = totalPages;
    if (currentPage < 1) currentPage = 1;

    const startIndex = (currentPage - 1) * pageSize;
    const pageItems = filtered.slice(startIndex, startIndex + pageSize);

    renderTable(pageItems, startIndex, totalCount);
    renderPagination(totalPages);
}

// ======================================================
// RENDER SUPPLIER TABLE
// ======================================================
function renderTable(items, startIndex, totalCount) {
    const tbody = document.getElementById("supplierTableBody");
    const emptyTable = document.getElementById("emptyTable");
    const tableResult = document.getElementById("tableResult");

    if (!tbody) return;

    if (totalCount === 0) {
        tbody.innerHTML = "";
        if (emptyTable) emptyTable.style.display = "block";
        if (tableResult) tableResult.textContent = "0 suppliers found";
        return;
    }

    if (emptyTable) emptyTable.style.display = "none";
    if (tableResult) {
        const from = startIndex + 1;
        const to = Math.min(startIndex + pageSize, totalCount);
        tableResult.textContent = `Showing ${from} - ${to} of ${totalCount} suppliers (${allSuppliers.length} total)`;
    }

    tbody.innerHTML = "";

    items.forEach((supplier, idx) => {
        const globalIndex = startIndex + idx + 1;
        const row = document.createElement("tr");

        // Initials for avatar
        const initials = getCompanyInitials(supplier.name);

        row.innerHTML = `
            <td>
                <span style="color:#64748b; font-weight:600; font-size:12px;">${globalIndex}</span>
            </td>

            <td>
                <div class="company-cell">
                    <div class="company-avatar">${initials}</div>
                    <div class="company-info">
                        <strong>${escapeHtml(supplier.name)}</strong>
                        <span>ID: #${supplier.id}</span>
                    </div>
                </div>
            </td>

            <td>
                ${supplier.contactPerson 
                    ? `<span style="display:inline-flex; align-items:center; gap:6px;"><i class="bi bi-person" style="color:#94a3b8;"></i> ${escapeHtml(supplier.contactPerson)}</span>` 
                    : `<span style="color:#64748b;">-</span>`
                }
            </td>

            <td>
                ${supplier.phone 
                    ? `<span style="display:inline-flex; align-items:center;">
                         <a href="tel:${escapeHtml(supplier.phone)}" class="contact-link">
                             <i class="bi bi-telephone" style="color:var(--orange);"></i> ${escapeHtml(supplier.phone)}
                         </a>
                         <button class="copy-chip" onclick="copyToClipboard('${escapeJs(supplier.phone)}', 'Phone number')" title="Copy phone">
                             <i class="bi bi-clipboard"></i>
                         </button>
                       </span>` 
                    : `<span style="color:#64748b;">-</span>`
                }
            </td>

            <td>
                ${supplier.email 
                    ? `<span style="display:inline-flex; align-items:center;">
                         <a href="mailto:${escapeHtml(supplier.email)}" class="contact-link">
                             <i class="bi bi-envelope" style="color:var(--blue);"></i> ${escapeHtml(supplier.email)}
                         </a>
                         <button class="copy-chip" onclick="copyToClipboard('${escapeJs(supplier.email)}', 'Email address')" title="Copy email">
                             <i class="bi bi-clipboard"></i>
                         </button>
                       </span>` 
                    : `<span style="color:#64748b;">-</span>`
                }
            </td>

            <td>
                ${supplier.address 
                    ? `<span title="${escapeHtml(supplier.address)}" style="display:inline-flex; align-items:center; gap:6px; max-width:220px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                         <i class="bi bi-geo-alt" style="color:#cbd5e1; flex-shrink:0;"></i> ${escapeHtml(supplier.address)}
                       </span>` 
                    : `<span style="color:#64748b;">-</span>`
                }
            </td>

            <td>
                <span class="status-badge ${supplier.status === 'ACTIVE' ? 'active' : 'inactive'}">
                    ${supplier.status === 'ACTIVE' ? '<span class="live-pulse-dot" style="margin-right:6px;"></span>' : ''}
                    ${escapeHtml(supplier.status || 'ACTIVE')}
                </span>
            </td>

            <td style="text-align: right;">
                <div class="table-actions" style="justify-content: flex-end;">
                    <button class="table-action view" onclick="viewSupplier(${supplier.id})" title="View Supplier Dossier">
                        <i class="bi bi-eye"></i>
                    </button>
                    <button class="table-action edit" onclick="editSupplier(${supplier.id})" title="Edit Supplier">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="table-action view" style="color:var(--green); border-color:rgba(52, 211, 153, 0.35); background:rgba(52, 211, 153, 0.12);" onclick="openInquiryModal(${supplier.id})" title="Send Inquiry">
                        <i class="bi bi-envelope-at"></i>
                    </button>
                    <button class="table-action delete" onclick="deleteSupplier(${supplier.id})" title="Delete Supplier">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;

        tbody.appendChild(row);
    });
}

function getCompanyInitials(name) {
    if (!name) return "SP";
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[1][0]).toUpperCase();
}

// ======================================================
// RENDER PAGINATION
// ======================================================
function renderPagination(totalPages) {
    const prevBtn = document.getElementById("prevPageBtn");
    const nextBtn = document.getElementById("nextPageBtn");
    const pageDisplay = document.getElementById("currentPageDisplay");

    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
    if (pageDisplay) pageDisplay.textContent = `${currentPage} / ${totalPages}`;
}

function changePage(delta) {
    currentPage += delta;
    applyFilters();
}

// ======================================================
// TAB SWITCHING (Like Material & Inventory)
// ======================================================
function changeTab(tab, btn) {
    currentTab = tab;
    currentPage = 1;

    document.querySelectorAll(".inventory-tabs .tab-button").forEach(b => b.classList.remove("active"));
    if (btn) btn.classList.add("active");

    applyFilters();
}

// ======================================================
// RESET FILTERS
// ======================================================
function resetFilters() {
    const searchInput = document.getElementById("supplierSearch");
    const statusSelect = document.getElementById("statusFilter");
    const sortSelect = document.getElementById("sortFilter");

    if (searchInput) searchInput.value = "";
    if (statusSelect) statusSelect.value = "";
    if (sortSelect) sortSelect.value = "newest";

    currentTab = "all";
    currentPage = 1;

    const allTabBtn = document.querySelector(".inventory-tabs .tab-button");
    document.querySelectorAll(".inventory-tabs .tab-button").forEach(b => b.classList.remove("active"));
    if (allTabBtn) allTabBtn.classList.add("active");

    applyFilters();
    showToast("Filters reset to default view.", "success");
}

// ======================================================
// BEAUTIFUL FUNCTION: EXPORT SUPPLIERS TO CSV
// ======================================================
function exportSuppliersCSV() {
    const listToExport = suppliers.length > 0 ? suppliers : allSuppliers;

    if (listToExport.length === 0) {
        showToast("No supplier records available to export.", "error");
        return;
    }

    const headers = ["ID", "Supplier Name", "Contact Person", "Phone", "Email", "Address", "Status"];
    const rows = listToExport.map(s => [
        s.id || "",
        `"${(s.name || "").replace(/"/g, '""')}"`,
        `"${(s.contactPerson || "").replace(/"/g, '""')}"`,
        `"${(s.phone || "").replace(/"/g, '""')}"`,
        `"${(s.email || "").replace(/"/g, '""')}"`,
        `"${(s.address || "").replace(/"/g, '""')}"`,
        `"${(s.status || "ACTIVE").replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `WBCMS_Suppliers_Directory_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${listToExport.length} suppliers to CSV.`, "success");
}

// ======================================================
// BEAUTIFUL FUNCTION: PRINT DIRECTORY
// ======================================================
function printDirectory() {
    window.print();
}

// ======================================================
// BEAUTIFUL FUNCTION: SUPPLIER DOSSIER MODAL
// ======================================================
async function viewSupplier(id) {
    let supplier = allSuppliers.find(s => s.id === id);

    if (!supplier) {
        try {
            const res = await fetch(`${API_URL}/${id}`, { headers: getHeaders() });
            if (res.ok) supplier = await res.json();
        } catch (e) {
            console.error(e);
        }
    }

    if (!supplier) {
        showToast("Supplier details not found.", "error");
        return;
    }

    activeDossierSupplier = supplier;

    // Populate Dossier Hero
    const viewAvatar = document.getElementById("viewAvatar");
    const viewName = document.getElementById("viewName");
    const viewStatus = document.getElementById("viewStatusBadge");
    const viewIdTag = document.getElementById("viewIdTag");
    const viewLastUpdated = document.getElementById("viewLastUpdated");

    if (viewAvatar) viewAvatar.textContent = getCompanyInitials(supplier.name);
    if (viewName) viewName.textContent = supplier.name || "Unknown Supplier";
    if (viewIdTag) viewIdTag.textContent = `ID: #${supplier.id}`;

    if (viewStatus) {
        viewStatus.textContent = supplier.status || "ACTIVE";
        viewStatus.className = `status-badge ${supplier.status === 'ACTIVE' ? 'active' : 'inactive'}`;
    }

    if (viewLastUpdated) {
        viewLastUpdated.textContent = supplier.updatedAt
            ? `Updated: ${new Date(supplier.updatedAt).toLocaleDateString()}`
            : "Active Record";
    }

    // Populate Details Grid
    const viewContact = document.getElementById("viewContact");
    const viewPhone = document.getElementById("viewPhone");
    const viewEmail = document.getElementById("viewEmail");
    const viewAddress = document.getElementById("viewAddress");

    if (viewContact) viewContact.textContent = supplier.contactPerson || "Not specified";
    if (viewPhone) viewPhone.textContent = supplier.phone || "Not specified";
    if (viewEmail) viewEmail.textContent = supplier.email || "Not specified";
    if (viewAddress) viewAddress.textContent = supplier.address || "Not specified";

    // Setup Copy Buttons in Dossier
    const copyPhoneBtn = document.getElementById("copyPhoneBtn");
    if (copyPhoneBtn) {
        copyPhoneBtn.onclick = () => copyToClipboard(supplier.phone, "Phone number");
        copyPhoneBtn.style.display = supplier.phone ? "inline-block" : "none";
    }

    const copyEmailBtn = document.getElementById("copyEmailBtn");
    if (copyEmailBtn) {
        copyEmailBtn.onclick = () => copyToClipboard(supplier.email, "Email address");
        copyEmailBtn.style.display = supplier.email ? "inline-block" : "none";
    }

    // Cross-reference materials supplied by this vendor
    const materialsContainer = document.getElementById("viewMaterialsList");
    const countTag = document.getElementById("viewMaterialCount");

    if (materialsContainer) {
        const supplierNameLower = (supplier.name || "").toLowerCase().trim();
        const suppliedItems = materialsCache.filter(m => {
            const mSupplier = (m.supplier || "").toLowerCase().trim();
            return mSupplier && (mSupplier.includes(supplierNameLower) || supplierNameLower.includes(mSupplier));
        });

        if (countTag) countTag.textContent = `${suppliedItems.length} items linked`;

        if (suppliedItems.length === 0) {
            materialsContainer.innerHTML = `<span style="font-size:12.5px; color:#64748b;">No inventory items specifically linked to this supplier. You can link materials in the Material & Inventory section.</span>`;
        } else {
            materialsContainer.innerHTML = suppliedItems.map(m => `
                <span class="supplied-pill" title="Stock: ${m.quantity || 0} ${m.unit || ''}">
                    <i class="bi bi-box"></i>
                    <strong>${escapeHtml(m.name)}</strong>
                    <span class="supplied-pill-badge">${m.quantity || 0} ${escapeHtml(m.unit || 'units')}</span>
                </span>
            `).join("");
        }
    }

    // Action buttons in Dossier
    const editBtn = document.getElementById("dossierEditBtn");
    if (editBtn) {
        editBtn.onclick = () => {
            closeViewSupplierModal();
            editSupplier(supplier.id);
        };
    }

    const inquiryBtn = document.getElementById("dossierInquiryBtn");
    if (inquiryBtn) {
        inquiryBtn.onclick = () => {
            closeViewSupplierModal();
            openInquiryModal(supplier.id);
        };
    }

    // Open Modal
    const modal = document.getElementById("viewSupplierModal");
    if (modal) modal.classList.add("show");
}

function closeViewSupplierModal() {
    const modal = document.getElementById("viewSupplierModal");
    if (modal) modal.classList.remove("show");
}

// ======================================================
// BEAUTIFUL FUNCTION: QUICK INQUIRY MODAL & OUTREACH
// ======================================================
function populateInquirySupplierSelect() {
    const select = document.getElementById("inquirySupplierSelect");
    if (!select) return;

    select.innerHTML = `<option value="">Select a recipient supplier...</option>` +
        allSuppliers.map(s => `
            <option value="${s.id}">
                ${escapeHtml(s.name)} ${s.email ? `(${escapeHtml(s.email)})` : '(No email)'}
            </option>
        `).join("");
}

function openInquiryModal(supplierId = null) {
    populateInquirySupplierSelect();
    const select = document.getElementById("inquirySupplierSelect");
    if (select && supplierId) {
        select.value = supplierId;
    }

    generateInquiryTemplate();

    const modal = document.getElementById("inquiryModal");
    if (modal) modal.classList.add("show");
}

function closeInquiryModal() {
    const modal = document.getElementById("inquiryModal");
    if (modal) modal.classList.remove("show");
}

function onInquirySupplierChange() {
    generateInquiryTemplate();
}

function generateInquiryTemplate() {
    const select = document.getElementById("inquirySupplierSelect");
    const typeSelect = document.getElementById("inquiryTypeSelect");
    const subjectInput = document.getElementById("inquirySubject");
    const bodyInput = document.getElementById("inquiryBody");

    const supplierId = select ? select.value : "";
    const supplier = allSuppliers.find(s => String(s.id) === String(supplierId));
    const supplierName = supplier ? supplier.name : "[Supplier Name]";
    const contactName = supplier && supplier.contactPerson ? supplier.contactPerson : "Procurement Team";
    const userName = localStorage.getItem("wbcms_username") || "Procurement Officer";

    const type = typeSelect ? typeSelect.value : "rfq";

    if (type === "rfq") {
        if (subjectInput) subjectInput.value = `[WBCMS RFQ] Request for Price Quotation — Construction Materials`;
        if (bodyInput) {
            bodyInput.value = 
`Dear ${contactName} / ${supplierName},

We are currently planning material requisitions for our upcoming construction project milestones. 

Could you please provide an updated official price quotation, available discounts, and estimated delivery lead time for the standard materials supplied to WBCMS Construction?

Please attach your catalog or itemized unit pricing at your earliest convenience.

Best regards,
${userName}
Procurement & Logistics Department
WBCMS Construction Management`;
        }
    } else if (type === "stock") {
        if (subjectInput) subjectInput.value = `[WBCMS Stock Inquiry] Material Availability & Lead Time Check`;
        if (bodyInput) {
            bodyInput.value = 
`Dear ${contactName},

We are writing from WBCMS Construction to verify current inventory stock levels and delivery lead times for urgent worksite requirements.

Please confirm whether standard bulk supplies can be dispatched within the next 48 to 72 hours upon issuance of a formal Purchase Order.

Thank you for your prompt confirmation.

Sincerely,
${userName}
Procurement & Logistics Department
WBCMS Construction Management`;
        }
    } else if (type === "po_followup") {
        if (subjectInput) subjectInput.value = `[WBCMS Status] Purchase Order Delivery Follow-up`;
        if (bodyInput) {
            bodyInput.value = 
`Dear ${contactName},

Hope this email finds you well. 

We would like to follow up on the status of our active orders dispatched to ${supplierName}. Could you kindly share the driver contact or estimated time of arrival (ETA) for our site delivery?

Thank you for your partnership.

Warm regards,
${userName}
Procurement & Inventory
WBCMS Construction Management`;
        }
    } else {
        if (subjectInput) subjectInput.value = `Inquiry regarding supplies — WBCMS Construction`;
        if (bodyInput) {
            bodyInput.value = 
`Dear ${contactName},

I hope this message finds you well.

[Please type your message here]

Best regards,
${userName}
WBCMS Construction Management`;
        }
    }
}

function launchEmailClient() {
    const select = document.getElementById("inquirySupplierSelect");
    const subjectInput = document.getElementById("inquirySubject");
    const bodyInput = document.getElementById("inquiryBody");

    const supplierId = select ? select.value : "";
    const supplier = allSuppliers.find(s => String(s.id) === String(supplierId));

    if (!supplier) {
        showToast("Please select a recipient supplier.", "error");
        return;
    }

    if (!supplier.email) {
        showToast(`No email address recorded for ${supplier.name}.`, "error");
        return;
    }

    const subject = encodeURIComponent(subjectInput ? subjectInput.value : "");
    const body = encodeURIComponent(bodyInput ? bodyInput.value : "");

    window.location.href = `mailto:${supplier.email}?subject=${subject}&body=${body}`;
    showToast("Launching default email client...", "success");
    closeInquiryModal();
}

function copyInquiryText() {
    const subject = document.getElementById("inquirySubject")?.value || "";
    const body = document.getElementById("inquiryBody")?.value || "";

    const textToCopy = `Subject: ${subject}\n\n${body}`;
    copyToClipboard(textToCopy, "Inquiry draft");
}

// ======================================================
// HELPER: COPY TO CLIPBOARD
// ======================================================
function copyToClipboard(text, label = "Item") {
    if (!text) {
        showToast("Nothing to copy.", "error");
        return;
    }

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text)
            .then(() => showToast(`${label} copied to clipboard!`, "success"))
            .catch(() => fallbackCopy(text, label));
    } else {
        fallbackCopy(text, label);
    }
}

function fallbackCopy(text, label) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-9999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand("copy");
        showToast(`${label} copied to clipboard!`, "success");
    } catch (e) {
        showToast("Failed to copy to clipboard.", "error");
    }
    document.body.removeChild(textArea);
}

// ======================================================
// ADD & EDIT SUPPLIER MODAL (CRUD Preserved)
// ======================================================
function openSupplierModal() {
    const modal = document.getElementById("supplierModal");
    const form = document.getElementById("supplierForm");

    if (form) form.reset();
    document.getElementById("supplierId").value = "";
    document.getElementById("modalTitle").textContent = "Add New Supplier";
    document.getElementById("supplierStatus").value = "ACTIVE";

    clearValidationMessages();
    if (modal) modal.classList.add("show");
}

function closeSupplierModal() {
    const modal = document.getElementById("supplierModal");
    if (modal) modal.classList.remove("show");
    clearValidationMessages();
}

async function saveSupplier(event) {
    event.preventDefault();
    clearValidationMessages();

    const supplierId = document.getElementById("supplierId").value;
    const supplierName = document.getElementById("supplierName").value.trim();
    const contactPerson = document.getElementById("contactPerson").value.trim();
    const phone = document.getElementById("supplierPhone").value.trim();
    const email = document.getElementById("supplierEmail").value.trim();
    const address = document.getElementById("supplierAddress").value.trim();
    const status = document.getElementById("supplierStatus").value;

    // Validation
    if (!supplierName) {
        document.getElementById("nameError").textContent = "Supplier name is required.";
        return;
    }

    if (email && !isValidEmail(email)) {
        document.getElementById("emailError").textContent = "Please enter a valid email address.";
        return;
    }

    const supplierData = {
        name: supplierName,
        contactPerson: contactPerson || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
        status: status || "ACTIVE"
    };

    try {
        const url = supplierId ? `${API_URL}/${supplierId}` : API_URL;
        const method = supplierId ? "PUT" : "POST";

        const response = await fetch(url, {
            method: method,
            headers: getHeaders(),
            body: JSON.stringify(supplierData)
        });

        if (!response.ok) throw new Error(await getApiError(response));

        closeSupplierModal();
        showToast(
            supplierId ? "Successfully edited supplier!" : "Successfully added supplier!",
            "success"
        );

        await loadSuppliers();

    } catch (error) {
        console.error("Save supplier error:", error);
        showToast(error.message || (supplierId ? "Error editing supplier: Failed to update." : "Error adding supplier."), "error");
    }
}

async function editSupplier(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`, { headers: getHeaders() });
        if (!response.ok) throw new Error(await getApiError(response));

        const supplier = await response.json();

        document.getElementById("supplierId").value = supplier.id;
        document.getElementById("supplierName").value = supplier.name || "";
        document.getElementById("contactPerson").value = supplier.contactPerson || "";
        document.getElementById("supplierPhone").value = supplier.phone || "";
        document.getElementById("supplierEmail").value = supplier.email || "";
        document.getElementById("supplierAddress").value = supplier.address || "";
        document.getElementById("supplierStatus").value = supplier.status || "ACTIVE";
        document.getElementById("modalTitle").textContent = "Edit Supplier Record";

        clearValidationMessages();
        document.getElementById("supplierModal").classList.add("show");

    } catch (error) {
        console.error("Edit supplier error:", error);
        showToast(error.message || "Failed to load supplier.", "error");
    }
}

async function deleteSupplier(id) {
    const supplier = allSuppliers.find(s => s.id === id);
    const name = supplier ? supplier.name : `Supplier #${id}`;

    const confirmed = confirm(
        `Are you sure you want to delete "${name}"?\n\nThis will remove the supplier record from SQL Server.`
    );

    if (!confirmed) return;

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: "DELETE",
            headers: getHeaders()
        });

        if (!response.ok) throw new Error(await getApiError(response));

        showToast("Successfully deleted supplier!", "success");
        await loadSuppliers();

    } catch (error) {
        console.error("Delete supplier error:", error);
        showToast(error.message || "Error deleting supplier.", "error");
    }
}

// ======================================================
// VALIDATION & HELPERS
// ======================================================
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function clearValidationMessages() {
    const nameError = document.getElementById("nameError");
    const emailError = document.getElementById("emailError");
    if (nameError) nameError.textContent = "";
    if (emailError) emailError.textContent = "";
}

async function getApiError(response) {
    try {
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
            const data = await response.json();
            return data.message || data.error || "Request failed.";
        }
        const text = await response.text();
        return text || `Request failed (${response.status}).`;
    } catch {
        return `Request failed (${response.status}).`;
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

function escapeJs(value) {
    if (!value) return "";
    return String(value).replace(/['"\\]/g, '\\$&');
}

function showToast(message, type = "success") {
    const toast = document.getElementById("toast");
    const toastMessage = document.getElementById("toastMessage");

    if (!toast || !toastMessage) return;

    toastMessage.textContent = message;
    toast.className = `toast ${type}`;

    setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => toast.classList.remove("show"), 3500);
}

function toggleSidebar() {
    const sidebar = document.getElementById("sidebar");
    if (sidebar) sidebar.classList.toggle("open");
}

function logout() {
    localStorage.removeItem("wbcms_token");
    localStorage.removeItem("wbcms_user_id");
    localStorage.removeItem("wbcms_username");
    localStorage.removeItem("wbcms_role");
    localStorage.removeItem("wbcms_user_type");
    window.location.replace("/staff-login.html");
}