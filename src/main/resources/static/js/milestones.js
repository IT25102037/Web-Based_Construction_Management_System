const token = localStorage.getItem("wbcms_token");
const userType = localStorage.getItem("wbcms_user_type");

if (!token || userType === "CLIENT") {
    window.location.replace("/staff-login.html");
}


let milestones = [];
let projects = [];


// =========================================================
// INITIAL LOAD
// =========================================================

document.addEventListener("DOMContentLoaded", async () => {

    loadProfile();

    await loadProjects();

    await loadMilestones();

    setupSearch();

});


// =========================================================
// PROFILE
// =========================================================

function loadProfile() {

    const username =
        localStorage.getItem("wbcms_username");

    const role =
        localStorage.getItem("wbcms_role");

    document.getElementById("profileName").textContent =
        username || "Staff User";

    document.getElementById("profileRole").textContent =
        formatRole(role || "STAFF");
}


function formatRole(role) {

    return role
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
}


// =========================================================
// LOAD PROJECTS
// =========================================================

async function loadProjects() {

    try {

        const response = await fetch(
            "/api/projects?page=0&size=100&sort=name,asc",
            {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );


        if (!response.ok) {
            throw new Error("Failed to load projects");
        }


        const data = await response.json();

        projects = data.content || [];


        populateProjectSelects();


    } catch (error) {

        console.error(error);

        showToast(
            "Unable to load projects.",
            "error"
        );
    }
}


// =========================================================
// PROJECT SELECTS
// =========================================================

function populateProjectSelects() {

    const filter =
        document.getElementById("projectFilter");

    const modalSelect =
        document.getElementById("milestoneProject");


    filter.innerHTML =
        `<option value="">All Projects</option>`;


    modalSelect.innerHTML =
        `<option value="">Select Project</option>`;


    projects.forEach(project => {

        filter.innerHTML += `
            <option value="${project.id}">
                ${escapeHtml(project.name)}
            </option>
        `;


        modalSelect.innerHTML += `
            <option value="${project.id}">
                ${escapeHtml(project.name)}
            </option>
        `;
    });
}


// =========================================================
// LOAD MILESTONES
// =========================================================

async function loadMilestones() {

    try {

        const projectId =
            document.getElementById("projectFilter").value;

        const status =
            document.getElementById("statusFilter").value;


        let url =
            "/api/milestones?page=0&size=100&sort=targetDate,asc";


        if (projectId) {
            url += `&projectId=${projectId}`;
        }


        if (status) {
            url += `&status=${status}`;
        }


        const response = await fetch(
            url,
            {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );


        if (!response.ok) {

            throw new Error(
                `Failed to load milestones (${response.status})`
            );
        }


        const data = await response.json();

        milestones = data.content || [];


        renderMilestones();

        updateStatistics();


    } catch (error) {

        console.error(error);

        document.getElementById(
            "milestoneTableBody"
        ).innerHTML = `
            <tr>
                <td colspan="7"
                    class="error-cell">
                    Failed to load milestones.
                </td>
            </tr>
        `;
    }
}


// =========================================================
// RENDER
// =========================================================

function renderMilestones() {

    const tbody =
        document.getElementById(
            "milestoneTableBody"
        );

    const empty =
        document.getElementById("emptyTable");


    if (milestones.length === 0) {

        tbody.innerHTML = "";

        empty.style.display = "block";

        return;
    }


    empty.style.display = "none";


    const search =
        document.getElementById(
            "milestoneSearch"
        ).value
            .trim()
            .toLowerCase();


    const filtered = milestones.filter(m => {

        return !search
            || m.name.toLowerCase().includes(search)
            || (m.projectName || "")
                .toLowerCase()
                .includes(search);
    });


    if (filtered.length === 0) {

        tbody.innerHTML = `
            <tr>
                <td colspan="7"
                    class="loading-cell">
                    No matching milestones found.
                </td>
            </tr>
        `;

        return;
    }


    tbody.innerHTML = filtered.map(
        (milestone, index) => {

            return `

                <tr>

                    <td>
                        ${index + 1}
                    </td>


                    <td>

                        <div class="milestone-name">

                            <strong>
                                ${escapeHtml(
                milestone.name
            )}
                            </strong>

                            <small>
                                ${escapeHtml(
                milestone.description || ""
            )}
                            </small>

                        </div>

                    </td>


                    <td>
                        ${escapeHtml(
                milestone.projectName || "-"
            )}
                    </td>


                    <td>
                        ${formatDate(
                milestone.targetDate
            )}
                    </td>


                    <td>
                        ${formatDate(
                milestone.completedDate
            )}
                    </td>


                    <td>

                        <span class="status-badge ${getStatusClass(
                milestone.status
            )}">

                            ${formatStatus(
                milestone.status
            )}

                        </span>

                    </td>


                    <td>

                        <div class="actions">

                            <button
                                    class="action-button edit"
                                    onclick="editMilestone(${milestone.id})"
                                    title="Edit"
                            >
                                <i class="bi bi-pencil-fill"></i>
                            </button>


                            <button
                                    class="action-button delete"
                                    onclick="deleteMilestone(${milestone.id})"
                                    title="Delete"
                            >
                                <i class="bi bi-trash-fill"></i>
                            </button>

                        </div>

                    </td>

                </tr>
            `;
        }
    ).join("");
}


// =========================================================
// STATISTICS
// =========================================================

function updateStatistics() {

    document.getElementById(
        "totalMilestones"
    ).textContent = milestones.length;


    document.getElementById(
        "inProgressMilestones"
    ).textContent =
        milestones.filter(
            m => m.status === "IN_PROGRESS"
        ).length;


    document.getElementById(
        "completedMilestones"
    ).textContent =
        milestones.filter(
            m => m.status === "COMPLETED"
        ).length;


    document.getElementById(
        "delayedMilestones"
    ).textContent =
        milestones.filter(
            m => m.status === "DELAYED"
        ).length;
}


// =========================================================
// OPEN CREATE MODAL
// =========================================================

function openMilestoneModal() {

    document.getElementById(
        "milestoneForm"
    ).reset();


    document.getElementById(
        "milestoneId"
    ).value = "";


    document.getElementById(
        "modalTitle"
    ).textContent =
        "Add New Milestone";


    document.getElementById(
        "milestoneStatus"
    ).value = "PENDING";


    document.getElementById(
        "milestoneModal"
    ).classList.add("show");
}


// =========================================================
// CLOSE MODAL
// =========================================================

function closeMilestoneModal() {

    document.getElementById(
        "milestoneModal"
    ).classList.remove("show");
}


// =========================================================
// EDIT
// =========================================================

function editMilestone(id) {

    const milestone =
        milestones.find(
            m => m.id === id
        );


    if (!milestone) return;


    document.getElementById(
        "milestoneId"
    ).value = milestone.id;


    document.getElementById(
        "milestoneName"
    ).value = milestone.name;


    document.getElementById(
        "milestoneProject"
    ).value = milestone.projectId;


    document.getElementById(
        "targetDate"
    ).value =
        milestone.targetDate || "";


    document.getElementById(
        "completedDate"
    ).value =
        milestone.completedDate || "";


    document.getElementById(
        "milestoneStatus"
    ).value =
        milestone.status;


    document.getElementById(
        "milestoneDescription"
    ).value =
        milestone.description || "";


    document.getElementById(
        "modalTitle"
    ).textContent =
        "Edit Milestone";


    document.getElementById(
        "milestoneModal"
    ).classList.add("show");
}


// =========================================================
// SAVE
// =========================================================

async function saveMilestone(event) {

    event.preventDefault();


    const id =
        document.getElementById(
            "milestoneId"
        ).value;


    const payload = {

        name:
            document.getElementById(
                "milestoneName"
            ).value.trim(),

        description:
            document.getElementById(
                "milestoneDescription"
            ).value.trim() || null,

        targetDate:
        document.getElementById(
            "targetDate"
        ).value,

        completedDate:
            document.getElementById(
                "completedDate"
            ).value || null,

        status:
        document.getElementById(
            "milestoneStatus"
        ).value,

        projectId:
            Number(
                document.getElementById(
                    "milestoneProject"
                ).value
            )
    };


    if (!payload.projectId) {

        showToast(
            "Please select a project.",
            "error"
        );

        return;
    }


    try {

        const url =
            id
                ? `/api/milestones/${id}`
                : "/api/milestones";


        const method =
            id ? "PUT" : "POST";


        const response = await fetch(
            url,
            {
                method,
                headers: {
                    "Content-Type":
                        "application/json",

                    "Authorization":
                        `Bearer ${token}`
                },
                body:
                    JSON.stringify(payload)
            }
        );


        if (!response.ok) {

            const message =
                await response.text();

            throw new Error(
                message ||
                "Failed to save milestone."
            );
        }


        closeMilestoneModal();


        showToast(
            id
                ? "Milestone updated successfully."
                : "Milestone created successfully.",
            "success"
        );


        await loadMilestones();


    } catch (error) {

        console.error(error);

        showToast(
            error.message ||
            "Unable to save milestone.",
            "error"
        );
    }
}


// =========================================================
// DELETE
// =========================================================

async function deleteMilestone(id) {

    const confirmed =
        confirm(
            "Are you sure you want to delete this milestone?"
        );


    if (!confirmed) return;


    try {

        const response = await fetch(
            `/api/milestones/${id}`,
            {
                method: "DELETE",

                headers: {
                    "Authorization":
                        `Bearer ${token}`
                }
            }
        );


        if (!response.ok) {

            throw new Error(
                "Failed to delete milestone."
            );
        }


        showToast(
            "Milestone deleted successfully.",
            "success"
        );


        await loadMilestones();


    } catch (error) {

        console.error(error);

        showToast(
            error.message,
            "error"
        );
    }
}


// =========================================================
// SEARCH / FILTER
// =========================================================

function setupSearch() {

    document.getElementById(
        "milestoneSearch"
    ).addEventListener(
        "input",
        renderMilestones
    );


    document.getElementById(
        "projectFilter"
    ).addEventListener(
        "change",
        loadMilestones
    );


    document.getElementById(
        "statusFilter"
    ).addEventListener(
        "change",
        loadMilestones
    );
}


// =========================================================
// HELPERS
// =========================================================

function formatDate(date) {

    if (!date) return "-";


    const d =
        new Date(date);


    return d.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


function formatStatus(status) {

    return status
        .replaceAll("_", " ")
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
}


function getStatusClass(status) {

    return status
        .toLowerCase()
        .replace("_", "-");
}


function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


// =========================================================
// TOAST
// =========================================================

function showToast(message, type = "success") {

    const toast =
        document.getElementById("toast");

    const messageElement =
        document.getElementById(
            "toastMessage"
        );


    messageElement.textContent =
        message;


    toast.className =
        `toast ${type} show`;


    setTimeout(() => {

        toast.classList.remove("show");

    }, 3000);
}


// =========================================================
// LOGOUT
// =========================================================

function logout() {

    localStorage.removeItem("wbcms_token");
    localStorage.removeItem("wbcms_user_id");
    localStorage.removeItem("wbcms_username");
    localStorage.removeItem("wbcms_role");
    localStorage.removeItem("wbcms_user_type");
    localStorage.removeItem("wbcms_user");

    window.location.replace(
        "/staff-login.html"
    );
}