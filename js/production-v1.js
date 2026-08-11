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

    function parseDate(value) {
        if (!value) {
            return null;
        }
    
        const [year, month, day] =
            value.split("-").map(Number);
    
        return new Date(
            year,
            month - 1,
            day
        );
    }
    
    
    function startOfDay(date) {
        return new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
        );
    }
    
    
    function addDays(date, amount) {
        const result =
            new Date(date);
    
        result.setDate(
            result.getDate() + amount
        );
    
        return result;
    }
    
    
    function differenceInDays(start, end) {
        const milliseconds =
            startOfDay(end) -
            startOfDay(start);
    
        return Math.round(
            milliseconds /
            (1000 * 60 * 60 * 24)
        );
    }
    
    
    function formatTimelineDate(date) {
        return new Intl.DateTimeFormat(
            "en-GB",
            {
                weekday: "short",
                day: "numeric",
                month: "short"
            }
        ).format(date);
    }
    
    
    function getTimelineRange(tasks) {
        const today =
            startOfDay(new Date());
    
        const taskDates = tasks
            .flatMap(task => [
                parseDate(task.plannedStartDate),
                parseDate(task.plannedEndDate)
            ])
            .filter(Boolean);
    
        let earliest = taskDates.length
            ? new Date(
                Math.min(
                    ...taskDates.map(
                        date => date.getTime()
                    )
                )
            )
            : today;
    
        let latest = taskDates.length
            ? new Date(
                Math.max(
                    ...taskDates.map(
                        date => date.getTime()
                    )
                )
            )
            : today;
    
        /*
         * Always make sure today is inside
         * the visible schedule.
         */
        if (today < earliest) {
            earliest = today;
        }
    
        if (today > latest) {
            latest = today;
        }
    
        /*
         * Give the schedule breathing room.
         */
        earliest =
            addDays(earliest, -7);
    
        latest =
            addDays(latest, 14);
    
        return {
            start: earliest,
            end: latest
        };
    }
    
    
    function getDayWidth() {
        return state.scale === "day"
            ? 64
            : 44;
    }

    function renderGantt() {
        const sidebar =
            element("ganttTaskRows");
    
        const header =
            element("ganttHeader");
    
        const rows =
            element("ganttRows");
    
        const empty =
            element("ganttEmpty");
    
        const timeline =
            element("ganttTimeline");
    
        sidebar.innerHTML = "";
        header.innerHTML = "";
        rows.innerHTML = "";
    
        if (!state.tasks.length) {
            empty.hidden = false;
            return;
        }
    
        empty.hidden = true;
    
        const range =
            getTimelineRange(state.tasks);
    
        const dayWidth =
            getDayWidth();
    
        const numberOfDays =
            differenceInDays(
                range.start,
                range.end
            ) + 1;
    
        const timelineWidth =
            numberOfDays * dayWidth;
    
        /*
         * Keep the CSS grid aligned
         * with the JS timeline.
         */
        document.documentElement.style.setProperty(
            "--gantt-day-width",
            `${dayWidth}px`
        );
    
        /*
         * LEFT SIDE
         */
        sidebar.innerHTML =
            state.tasks.map(task => `
                <article
                    class="gantt-task-row"
                    data-task-id="${task.id}"
                >
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
                                ? ` · ${escapeHtml(
                                    task.itemDescription
                                )}`
                                : ""
                        }
                    </small>
                </article>
            `).join("");
    
        /*
         * DATE HEADER
         */
        const headerDays = [];
    
        for (
            let index = 0;
            index < numberOfDays;
            index += 1
        ) {
            const date =
                addDays(
                    range.start,
                    index
                );
    
            const isToday =
                differenceInDays(
                    startOfDay(new Date()),
                    date
                ) === 0;
    
            headerDays.push(`
                <div
                    class="gantt-date-cell ${
                        isToday
                            ? "is-today"
                            : ""
                    }"
                    style="
                        width: ${dayWidth}px;
                        min-width: ${dayWidth}px;
                    "
                >
                    ${escapeHtml(
                        formatTimelineDate(date)
                    )}
                </div>
            `);
        }
    
        header.style.width =
            `${timelineWidth}px`;
    
        header.innerHTML =
            headerDays.join("");
    
        /*
         * TASK BARS
         */
        rows.style.width =
            `${timelineWidth}px`;
    
        rows.innerHTML =
            state.tasks.map(task => {
                const start =
                    parseDate(
                        task.plannedStartDate
                    );
    
                const end =
                    parseDate(
                        task.plannedEndDate
                    );
    
                if (!start || !end) {
                    return `
                        <div class="gantt-row">
                            <div
                                class="gantt-unscheduled"
                            >
                                Unscheduled
                            </div>
                        </div>
                    `;
                }
    
                const offsetDays =
                    differenceInDays(
                        range.start,
                        start
                    );
    
                const durationDays =
                    differenceInDays(
                        start,
                        end
                    ) + 1;
    
                const left =
                    offsetDays * dayWidth;
    
                const width =
                    Math.max(
                        dayWidth,
                        durationDays * dayWidth
                    );
    
                const progress =
                    Math.min(
                        100,
                        Math.max(
                            0,
                            Number(
                                task.progress || 0
                            )
                        )
                    );
    
                return `
                    <div
                        class="gantt-row"
                        data-task-id="${task.id}"
                    >
                        <button
                            type="button"
                            class="gantt-bar"
                            data-task-id="${task.id}"
                            data-status="${escapeHtml(
                                task.status
                            )}"
                            style="
                                left: ${left}px;
                                width: ${width}px;
                            "
                            title="${escapeHtml(
                                task.taskName
                            )}"
                        >
                            <span
                                class="gantt-bar-progress"
                                style="
                                    width: ${progress}%;
                                "
                            ></span>
    
                            <span
                                class="gantt-bar-content"
                            >
                                <span>
                                    ${escapeHtml(
                                        task.taskName
                                    )}
                                </span>
    
                                <small>
                                    ${progress}%
                                </small>
                            </span>
                        </button>
                    </div>
                `;
            }).join("");
    
        /*
         * TODAY LINE
         */
        const today =
            startOfDay(new Date());
    
        const todayOffset =
            differenceInDays(
                range.start,
                today
            );
    
        if (
            todayOffset >= 0 &&
            todayOffset < numberOfDays
        ) {
            const line =
                document.createElement("div");
    
            line.className =
                "gantt-today-line";
    
            line.style.left =
                `${
                    todayOffset *
                    dayWidth +
                    dayWidth / 2
                }px`;
    
            rows.appendChild(line);
        }
    
        /*
         * Store information so the
         * Today button can use it.
         */
        state.timeline = {
            start:
                range.start,
    
            dayWidth
        };
    
        scrollTimelineToToday();
    }

    function scrollTimelineToToday() {
        if (!state.timeline) {
            return;
        }
    
        const timeline =
            element("ganttTimeline");
    
        const today =
            startOfDay(new Date());
    
        const offset =
            differenceInDays(
                state.timeline.start,
                today
            );
    
        if (offset < 0) {
            return;
        }
    
        const position =
            offset *
            state.timeline.dayWidth;
    
        timeline.scrollLeft =
            Math.max(
                0,
                position -
                timeline.clientWidth / 3
            );
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
    
    element("todayButton")
        .addEventListener(
            "click",
            scrollTimelineToToday
        );
    loadProductionSchedule();
})();