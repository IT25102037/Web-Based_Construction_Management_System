const token =
    localStorage.getItem("wbcms_token");


if (!token) {
    window.location.href = "/staff-login.html";
}


const authHeaders = () => {

    return {
        "Authorization":
            `Bearer ${localStorage.getItem("wbcms_token")}`
    };

};


document.addEventListener(
    "DOMContentLoaded",
    async () => {

        const user =
            JSON.parse(
                localStorage.getItem(
                    "wbcms_user"
                ) || "{}"
            );


        document.getElementById(
            "userName"
        ).textContent =
            user.username || "Staff User";


        document.getElementById(
            "topUser"
        ).textContent =
            `${user.username || "Staff User"}⌄`;


        document.getElementById(
            "userRole"
        ).textContent =
            user.role || "STAFF";


        document.getElementById(
            "todayDate"
        ).textContent =
            new Date().toLocaleDateString(
                "en-GB",
                {
                    weekday: "long",
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                }
            );


        document.getElementById(
            "logoutBtn"
        ).onclick = () => {

            localStorage.removeItem(
                "wbcms_token"
            );

            localStorage.removeItem(
                "wbcms_user"
            );

            window.location.href =
                "/login.html";

        };


        try {

            const [
                summaryResponse,
                projectsResponse
            ] = await Promise.all([

                fetch(
                    "/api/reports/summary",
                    {
                        headers:
                            authHeaders()
                    }
                ),

                fetch(
                    "/api/projects?page=0&size=6",
                    {
                        headers:
                            authHeaders()
                    }
                )

            ]);


            if (
                !summaryResponse.ok ||
                !projectsResponse.ok
            ) {

                throw new Error(
                    "Could not load dashboard data."
                );

            }


            const summary =
                await summaryResponse.json();


            const page =
                await projectsResponse.json();


            const projects =
                page.content || page;


            document.getElementById(
                "totalProjects"
            ).textContent =
                summary.totalProjects ??
                projects.length;


            document.getElementById(
                "activeProjects"
            ).textContent =
                summary.activeProjects ??
                projects.filter(
                    p =>
                        p.status === "ONGOING"
                ).length;


            document.getElementById(
                "completedProjects"
            ).textContent =
                summary.completedProjects ??
                projects.filter(
                    p =>
                        p.status === "COMPLETED"
                ).length;


            document.getElementById(
                "attentionTasks"
            ).textContent =
                summary.tasksNeedingAttention ??
                "—";


            document.getElementById(
                "statusTotal"
            ).textContent =
                summary.totalProjects ??
                projects.length;


            const list =
                document.getElementById(
                    "recentProjects"
                );


            list.innerHTML =
                projects
                    .slice(0, 5)
                    .map(project => `

                    <div class="recent-item">

                        <div>

                            <h3>
                                ${escapeHtml(
                        project.name ||
                        "Untitled Project"
                    )}
                            </h3>

                            <p>
                                ${escapeHtml(
                        project.location ||
                        "Location not set"
                    )}

                                ·

                                ${escapeHtml(
                        project.status ||
                        ""
                    )}
                            </p>

                        </div>


                        <div class="progress-bar">

                            <i
                                style="
                                width:${Number(
                        project.completionPercentage ||
                        0
                    )}%;
                                ">
                            </i>

                        </div>


                        <b>
                            ${Number(
                        project.completionPercentage ||
                        0
                    )}%
                        </b>

                    </div>

                `)
                    .join("");


        } catch (error) {

            document.getElementById(
                "recentProjects"
            ).innerHTML = `
                <div class="loading">
                    ${error.message}
                </div>
            `;

        }

    }
);


function escapeHtml(value) {

    return String(value).replace(
        /[&<>"']/g,

        character => ({

            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"

        }[character])
    );

}