(() => {
    "use strict";

    const API_BASE =
        window.LUXSOME_ENV?.apiBase ||
        "https://api-develop.luxsomepackaging.com";

    const token =
        sessionStorage.getItem("luxsomeAdminToken");

    if (!token) {
        window.location.replace("/admin/login/");
        return;
    }

    const state = {
        tasks: [],
        scale: "week"
    };

    const element = (id) =>
        document.getElementById(id);

    function escapeHtml(value) {
        return String(value ?? "").replace(
            /[&<>"']/g,
            (character) => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            })[character]
        );
    }

    async function api(path, options = {}) {
        const response = await fetch(
            `${API_BASE}${path}`,
            {
                ...options,

                headers: {
                    Authorization:
                        `Bearer ${token}`,

                    "Content-Type":
                        "application/json",

                    ...(options.headers || {})
                }
            }
        );

        const data =
            await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.message ||
                "The request could not be completed."
            );
        }

        return data;
    }

    async function loadProductionSchedule() {
        const message =
            element("productionMessage");

        try {
            message.textContent =
                "Loading production schedule…";

            const parameters =
                new URLSearchParams();

            const search =
                element("productionSearch")
                    .value.trim();

            const status =
                element("taskStatusFilter").value;

            const assignedTo =
                element("assigneeFilter")
                    .value.trim();

            if (search) {
                parameters.set(
                    "search",
                    search
                );
            }

            if (status) {
                parameters.set(
                    "status",
                    status
                );
            }

            if (assignedTo) {
                parameters.set(
                    "assignedTo",
                    assignedTo
                );
            }

            const query =
                parameters.toString();

            const data = await api(
                `/admin/production-schedule${
                    query ? `?${query}` : ""
                }`
            );

            state.tasks =
                data.tasks || [];

            renderStats();
            renderGantt();

            message.textContent = "";

        } catch (error) {
            message.textContent =
                error.message;
        }
    }

    function renderStats() {
        const today =
            new Date()
                .toISOString()
                .slice(0, 10);

        element("scheduledCount")
            .textContent =
                state.tasks.length;

        element("inProgressCount")
            .textContent =
                state.tasks.filter(
                    task =>
                        task.status ===
                        "in_progress"
                ).length;

        element("blockedCount")
            .textContent =
                state.tasks.filter(
                    task =>
                        task.status ===
                        "blocked"
                ).length;

        element("overdueCount")
            .textContent =
                state.tasks.filter(
                    task =>
                        task.plannedEndDate &&
                        task.plannedEndDate < today &&
                        ![
                            "completed",
                            "cancelled"
                        ].includes(task.status)
                ).length;
    }

    function renderGantt() {
        const sidebar =
            element("ganttTaskRows");

        const timeline =
            element("ganttRows");

        const empty =
            element("ganttEmpty");

        sidebar.innerHTML = "";
        timeline.innerHTML = "";

        if (!state.tasks.length) {
            empty.hidden = false;
            return;
        }

        empty.hidden = true;

        /*
         * Temporary row rendering.
         * Actual timeline positioning comes next.
         */
        sidebar.innerHTML =
            state.tasks.map(task => `
                <article class="gantt-task-row">
                    <strong>
                        ${escapeHtml(task.taskName)}
                    </strong>

                    <span>
                        ${escapeHtml(
                            task.brandName ||
                            task.customerName ||
                            "—"
                        )}
                    </span>

                    <small>
                        ${escapeHtml(
                            task.orderReference
                        )}
                        ${
                            task.itemDescription
                                ? ` · ${
                                    escapeHtml(
                                        task.itemDescription
                                    )
                                }`
                                : ""
                        }
                    </small>
                </article>
            `).join("");

        timeline.innerHTML =
            state.tasks.map(task => `
                <div class="gantt-row">
                    <div
                        class="gantt-placeholder-bar"
                        title="${escapeHtml(
                            task.taskName
                        )}"
                    >
                        ${escapeHtml(
                            task.status
                        )}
                    </div>
                </div>
            `).join("");
    }

    let searchTimer;

    element("productionSearch")
        .addEventListener(
            "input",
            () => {
                clearTimeout(searchTimer);

                searchTimer =
                    setTimeout(
                        loadProductionSchedule,
                        300
                    );
            }
        );

    element("taskStatusFilter")
        .addEventListener(
            "change",
            loadProductionSchedule
        );

    element("assigneeFilter")
        .addEventListener(
            "input",
            () => {
                clearTimeout(searchTimer);

                searchTimer =
                    setTimeout(
                        loadProductionSchedule,
                        300
                    );
            }
        );

    element("timelineScale")
        .addEventListener(
            "change",
            (event) => {
                state.scale =
                    event.target.value;

                renderGantt();
            }
        );

    element("refreshButton")
        .addEventListener(
            "click",
            loadProductionSchedule
        );

    element("logout")
        .addEventListener(
            "click",
            () => {
                sessionStorage.removeItem(
                    "luxsomeAdminToken"
                );

                window.location.replace(
                    "/admin/login/"
                );
            }
        );

    loadProductionSchedule();
})();