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
        orders: [],
        orderDetails: new Map(),

        scale: "week",
        timeline: null,

        taskPanelMode: "edit",
        editingTaskId: null,
        cascadePreview: null,
        ganttInteraction: null,
        suppressTaskClickUntil: 0
    };

    const element = (id) =>
        document.getElementById(id);


    /* ==================================================
       HELPERS
    ================================================== */

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


    function localDateString(
        date = new Date()
    ) {
        const year =
            date.getFullYear();

        const month =
            String(
                date.getMonth() + 1
            ).padStart(2, "0");

        const day =
            String(
                date.getDate()
            ).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }


    /* ==================================================
       API
    ================================================== */

    async function api(
        path,
        options = {}
    ) {
        const response =
            await fetch(
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
            await response
                .json()
                .catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.message ||
                "The request could not be completed."
            );
        }

        return data;
    }


    /* ==================================================
       ACTIVE ORDERS
    ================================================== */

    async function loadActiveOrders() {
        const data =
            await api(
                "/admin/orders?view=active&limit=100"
            );

        state.orders =
            data.orders || [];

        return state.orders;
    }


    /* ==================================================
       PRODUCTION SCHEDULE
    ================================================== */

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
                    .value
                    .trim();

            const status =
                element("taskStatusFilter")
                    .value;

            const assignedTo =
                element("assigneeFilter")
                    .value
                    .trim();

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

            const data =
                await api(
                    `/admin/production-schedule${
                        query
                            ? `?${query}`
                            : ""
                    }`
                );

            state.tasks =
                data.tasks || [];

            renderStats();
            renderGantt();

            message.textContent =
                "";

        } catch (error) {
            console.error(error);

            message.textContent =
                error.message;
        }
    }


    /* ==================================================
       STATS
    ================================================== */

    function renderStats() {
        const today =
            localDateString();

        element("scheduledCount")
            .textContent =
                state.tasks.length;


        element("inProgressCount")
            .textContent =
                state.tasks.filter(
                    (task) =>
                        task.status ===
                        "in_progress"
                ).length;


        element("blockedCount")
            .textContent =
                state.tasks.filter(
                    (task) =>
                        task.status ===
                        "blocked"
                ).length;


        element("overdueCount")
            .textContent =
                state.tasks.filter(
                    (task) =>
                        task.plannedEndDate &&
                        task.plannedEndDate <
                            today &&
                        ![
                            "completed",
                            "cancelled"
                        ].includes(
                            task.status
                        )
                ).length;
    }


    /* ==================================================
       DATE HELPERS
    ================================================== */

    function parseDate(value) {
        if (!value) {
            return null;
        }

        const [
            year,
            month,
            day
        ] =
            value
                .split("-")
                .map(Number);

        if (
            !year ||
            !month ||
            !day
        ) {
            return null;
        }

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


    function addDays(
        date,
        amount
    ) {
        const result =
            new Date(date);

        result.setDate(
            result.getDate() +
            amount
        );

        return result;
    }


    function differenceInDays(
        start,
        end
    ) {
        const milliseconds =
            startOfDay(end) -
            startOfDay(start);

        return Math.round(
            milliseconds /
            86400000
        );
    }


    function formatTimelineDate(
        date
    ) {
        return new Intl.DateTimeFormat(
            "en-GB",
            {
                weekday: "short",
                day: "numeric",
                month: "short"
            }
        ).format(date);
    }


    function getTimelineRange(
        tasks
    ) {
        const today =
            startOfDay(
                new Date()
            );

        const taskDates =
            tasks
                .flatMap(
                    (task) => [
                        parseDate(
                            task.plannedStartDate
                        ),
                        parseDate(
                            task.plannedEndDate
                        )
                    ]
                )
                .filter(Boolean);

        let earliest =
            taskDates.length
                ? new Date(
                    Math.min(
                        ...taskDates.map(
                            (date) =>
                                date.getTime()
                        )
                    )
                )
                : today;

        let latest =
            taskDates.length
                ? new Date(
                    Math.max(
                        ...taskDates.map(
                            (date) =>
                                date.getTime()
                        )
                    )
                )
                : today;

        if (today < earliest) {
            earliest = today;
        }

        if (today > latest) {
            latest = today;
        }

        return {
            start:
                addDays(
                    earliest,
                    -7
                ),

            end:
                addDays(
                    latest,
                    14
                )
        };
    }


    function getDayWidth() {
        return state.scale ===
            "day"
            ? 64
            : 44;
    }

    /* ==================================================
       SCHEDULE CONFLICTS
    ================================================== */

    function findTaskById(taskId) {
        if (!taskId) {
            return null;
        }

        return state.tasks.find(
            (task) =>
                Number(task.id) ===
                Number(taskId)
        ) || null;
    }


    function getDependencyConflict(task) {
        if (
            !task ||
            !task.dependencyTaskId ||
            !task.plannedStartDate
        ) {
            return null;
        }

        const dependency =
            findTaskById(
                task.dependencyTaskId
            );

        if (
            !dependency ||
            !dependency.plannedEndDate
        ) {
            return null;
        }

        const taskStart =
            parseDate(
                task.plannedStartDate
            );

        const dependencyEnd =
            parseDate(
                dependency.plannedEndDate
            );

        if (
            !taskStart ||
            !dependencyEnd
        ) {
            return null;
        }

        /*
         * Dates are day-granular and inclusive. If an upstream
         * task ends on Aug 15, its dependent task must start on
         * Aug 16 or later.
         */
        if (
            taskStart >
            dependencyEnd
        ) {
            return null;
        }

        const earliestStart =
            addDays(
                dependencyEnd,
                1
            );

        return {
            dependency,
            earliestStart,
            earliestStartDate:
                localDateString(
                    earliestStart
                ),
            message:
                `${task.taskName || "This task"} starts before ${dependency.taskName || "its dependency"} is complete. Earliest valid start: ${formatTimelineDate(earliestStart)}.`
        };
    }


    function getFormDependencyConflict() {
        const dependencyValue =
            element("taskDependency")
                ?.value;

        const plannedStartDate =
            element("taskPlannedStart")
                ?.value;

        if (
            !dependencyValue ||
            !plannedStartDate
        ) {
            return null;
        }

        return getDependencyConflict({
            id:
                state.editingTaskId,
            taskName:
                element("taskName")
                    ?.value
                    ?.trim() ||
                "This task",
            dependencyTaskId:
                Number(
                    dependencyValue
                ),
            plannedStartDate
        });
    }


    function ensureScheduleConflictNotice() {
        let notice =
            element(
                "taskScheduleConflict"
            );

        if (notice) {
            return notice;
        }

        const formMessage =
            element(
                "taskFormMessage"
            );

        if (!formMessage) {
            return null;
        }

        notice =
            document.createElement(
                "div"
            );

        notice.id =
            "taskScheduleConflict";

        notice.className =
            "task-schedule-conflict";

        notice.hidden =
            true;

        formMessage.parentNode.insertBefore(
            notice,
            formMessage
        );

        return notice;
    }


    function refreshScheduleConflictNotice() {
        const notice =
            ensureScheduleConflictNotice();

        if (!notice) {
            return;
        }

        const conflict =
            getFormDependencyConflict();

        if (!conflict) {
            notice.hidden =
                true;

            notice.innerHTML =
                "";
        } else {
            notice.hidden =
                false;

            notice.innerHTML = `
                <strong>Schedule conflict</strong>
                <span>
                    ${escapeHtml(
                        conflict.message
                    )}
                </span>
            `;
        }

        refreshCascadeControls();
    }


    function ensureCascadePanel() {
        let panel =
            element(
                "taskCascadePanel"
            );

        if (panel) {
            return panel;
        }

        const formMessage =
            element(
                "taskFormMessage"
            );

        if (!formMessage) {
            return null;
        }

        panel =
            document.createElement(
                "div"
            );

        panel.id =
            "taskCascadePanel";

        panel.className =
            "task-cascade-panel";

        panel.hidden =
            true;

        formMessage.parentNode.insertBefore(
            panel,
            formMessage
        );

        return panel;
    }


    function taskDurationDays(task) {
        const start =
            parseDate(
                task?.plannedStartDate
            );

        const end =
            parseDate(
                task?.plannedEndDate
            );

        if (
            !start ||
            !end
        ) {
            return null;
        }

        return Math.max(
            1,
            differenceInDays(
                start,
                end
            ) + 1
        );
    }


    function getOrderTasks(
        orderReference
    ) {
        return state.tasks.filter(
            (task) =>
                task.orderReference ===
                orderReference
        );
    }


    function getDirectDependants(
        taskId,
        orderReference
    ) {
        return getOrderTasks(
            orderReference
        ).filter(
            (task) =>
                Number(
                    task.dependencyTaskId
                ) ===
                Number(taskId)
        );
    }


    function hasDownstreamTasks(
        taskId,
        orderReference
    ) {
        return getDirectDependants(
            taskId,
            orderReference
        ).length > 0;
    }


    function validateDependencyGraph(
        orderReference,
        overrideTaskId = null,
        overrideDependencyId = null
    ) {
        const tasks =
            getOrderTasks(
                orderReference
            );

        const taskMap =
            new Map(
                tasks.map(
                    (task) => [
                        Number(task.id),
                        task
                    ]
                )
            );

        const visiting =
            new Set();

        const visited =
            new Set();

        function visit(taskId) {
            const id =
                Number(taskId);

            if (visiting.has(id)) {
                throw new Error(
                    "A circular task dependency was detected. Remove the circular dependency before rescheduling."
                );
            }

            if (visited.has(id)) {
                return;
            }

            const task =
                taskMap.get(id);

            if (!task) {
                return;
            }

            visiting.add(id);

            const dependencyId =
                Number(task.id) ===
                Number(overrideTaskId)
                    ? (overrideDependencyId
                        ? Number(overrideDependencyId)
                        : null)
                    : task.dependencyTaskId;

            if (
                dependencyId &&
                taskMap.has(
                    Number(
                        dependencyId
                    )
                )
            ) {
                visit(
                    dependencyId
                );
            }

            visiting.delete(id);
            visited.add(id);
        }

        tasks.forEach(
            (task) =>
                visit(task.id)
        );
    }


    function buildCascadePlan() {
        if (
            state.taskPanelMode !==
            "edit"
        ) {
            return {
                changes: [],
                warnings: []
            };
        }

        const rootTask =
            findTask(
                state.editingTaskId
            );

        if (!rootTask) {
            return {
                changes: [],
                warnings: []
            };
        }

        const orderReference =
            rootTask.orderReference;

        const dependencyValue =
            element(
                "taskDependency"
            ).value;

        validateDependencyGraph(
            orderReference,
            rootTask.id,
            dependencyValue
                ? Number(dependencyValue)
                : null
        );

        const formStart =
            element(
                "taskPlannedStart"
            ).value;

        const formEnd =
            element(
                "taskPlannedEnd"
            ).value;

        if (
            !formStart ||
            !formEnd
        ) {
            throw new Error(
                "Set both planned start and planned end dates before previewing schedule changes."
            );
        }

        const formStartDate =
            parseDate(formStart);

        const formEndDate =
            parseDate(formEnd);

        if (
            !formStartDate ||
            !formEndDate ||
            formEndDate < formStartDate
        ) {
            throw new Error(
                "The planned dates are not valid."
            );
        }

        const proposed =
            new Map();

        const changes =
            [];

        const warnings =
            [];

        const rootDuration =
            Math.max(
                1,
                differenceInDays(
                    formStartDate,
                    formEndDate
                ) + 1
            );

        let rootStart =
            formStartDate;

        let rootEnd =
            formEndDate;

        if (dependencyValue) {
            const dependency =
                findTask(
                    Number(
                        dependencyValue
                    )
                );

            if (
                dependency?.plannedEndDate
            ) {
                const dependencyEnd =
                    parseDate(
                        dependency.plannedEndDate
                    );

                if (
                    dependencyEnd &&
                    rootStart <= dependencyEnd
                ) {
                    rootStart =
                        addDays(
                            dependencyEnd,
                            1
                        );

                    rootEnd =
                        addDays(
                            rootStart,
                            rootDuration - 1
                        );
                }
            }
        }

        proposed.set(
            Number(rootTask.id),
            {
                start: rootStart,
                end: rootEnd
            }
        );

        const originalRootStart =
            parseDate(
                rootTask.plannedStartDate
            );

        const originalRootEnd =
            parseDate(
                rootTask.plannedEndDate
            );

        if (
            !originalRootStart ||
            !originalRootEnd ||
            localDateString(
                originalRootStart
            ) !==
                localDateString(
                    rootStart
                ) ||
            localDateString(
                originalRootEnd
            ) !==
                localDateString(
                    rootEnd
                )
        ) {
            changes.push({
                task:
                    rootTask,
                oldStart:
                    rootTask.plannedStartDate,
                oldEnd:
                    rootTask.plannedEndDate,
                newStart:
                    localDateString(
                        rootStart
                    ),
                newEnd:
                    localDateString(
                        rootEnd
                    ),
                reason:
                    rootStart.getTime() !==
                    formStartDate.getTime()
                        ? "Shifted after its dependency"
                        : "Current task date change"
            });
        }

        const queue =
            [Number(rootTask.id)];

        const processed =
            new Set();

        while (queue.length) {
            const parentId =
                queue.shift();

            if (processed.has(parentId)) {
                continue;
            }

            processed.add(parentId);

            const parentDates =
                proposed.get(parentId) || (() => {
                    const parent =
                        findTask(parentId);

                    const start =
                        parseDate(
                            parent?.plannedStartDate
                        );

                    const end =
                        parseDate(
                            parent?.plannedEndDate
                        );

                    return (
                        start && end
                    )
                        ? { start, end }
                        : null;
                })();

            if (!parentDates) {
                continue;
            }

            const children =
                getDirectDependants(
                    parentId,
                    orderReference
                );

            for (const child of children) {
                const childId =
                    Number(child.id);

                const childStart =
                    parseDate(
                        child.plannedStartDate
                    );

                const childEnd =
                    parseDate(
                        child.plannedEndDate
                    );

                if (
                    !childStart ||
                    !childEnd
                ) {
                    warnings.push(
                        `${child.taskName || "A downstream task"} is unscheduled and was not moved.`
                    );

                    queue.push(childId);
                    continue;
                }

                const earliestStart =
                    addDays(
                        parentDates.end,
                        1
                    );

                let effectiveStart =
                    childStart;

                let effectiveEnd =
                    childEnd;

                if (
                    childStart <
                    earliestStart
                ) {
                    if (
                        child.status ===
                        "completed"
                    ) {
                        warnings.push(
                            `${child.taskName || "A completed task"} conflicts with the revised schedule but was not changed because it is completed.`
                        );
                    } else {
                        const duration =
                            taskDurationDays(
                                child
                            );

                        effectiveStart =
                            earliestStart;

                        effectiveEnd =
                            addDays(
                                effectiveStart,
                                (duration || 1) - 1
                            );

                        changes.push({
                            task:
                                child,
                            oldStart:
                                child.plannedStartDate,
                            oldEnd:
                                child.plannedEndDate,
                            newStart:
                                localDateString(
                                    effectiveStart
                                ),
                            newEnd:
                                localDateString(
                                    effectiveEnd
                                ),
                            reason:
                                `Shifted after ${findTask(parentId)?.taskName || "dependency"}`
                        });
                    }
                }

                proposed.set(
                    childId,
                    {
                        start:
                            effectiveStart,
                        end:
                            effectiveEnd
                    }
                );

                queue.push(childId);
            }
        }

        const uniqueChanges =
            Array.from(
                new Map(
                    changes.map(
                        (change) => [
                            Number(
                                change.task.id
                            ),
                            change
                        ]
                    )
                ).values()
            );

        return {
            orderReference,
            changes:
                uniqueChanges,
            warnings
        };
    }


    function clearCascadePreview() {
        state.cascadePreview =
            null;

        const panel =
            element(
                "taskCascadePanel"
            );

        if (panel) {
            panel.innerHTML =
                "";
        }
    }


    function refreshCascadeControls() {
        const panel =
            ensureCascadePanel();

        if (!panel) {
            return;
        }

        clearCascadePreview();

        if (
            state.taskPanelMode !==
            "edit" ||
            !state.editingTaskId
        ) {
            panel.hidden =
                true;

            return;
        }

        const task =
            findTask(
                state.editingTaskId
            );

        if (!task) {
            panel.hidden =
                true;

            return;
        }

        const conflict =
            getFormDependencyConflict();

        const hasDownstream =
            hasDownstreamTasks(
                task.id,
                task.orderReference
            );

        if (
            !conflict &&
            !hasDownstream
        ) {
            panel.hidden =
                true;

            return;
        }

        panel.hidden =
            false;

        panel.innerHTML = `
            <div class="task-cascade-panel__intro">
                <div>
                    <strong>Dependency-aware scheduling</strong>
                    <span>
                        Preview any date shifts before changing the production schedule.
                    </span>
                </div>

                <button
                    id="previewCascadeButton"
                    class="task-cascade-button"
                    type="button"
                >
                    Preview schedule changes
                </button>
            </div>
        `;

        element(
            "previewCascadeButton"
        )?.addEventListener(
            "click",
            previewCascadeReschedule
        );
    }


    function previewCascadeReschedule() {
        const panel =
            ensureCascadePanel();

        if (!panel) {
            return;
        }

        try {
            const plan =
                buildCascadePlan();

            state.cascadePreview =
                plan;

            if (
                !plan.changes.length
            ) {
                panel.hidden =
                    false;

                panel.innerHTML = `
                    <div class="task-cascade-empty">
                        <strong>No schedule changes required</strong>
                        <span>
                            The current task and its downstream dependencies already have valid dates.
                        </span>
                    </div>
                `;

                return;
            }

            panel.hidden =
                false;

            panel.innerHTML = `
                <div class="task-cascade-preview">
                    <div class="task-cascade-preview__header">
                        <div>
                            <strong>Proposed schedule changes</strong>
                            <span>
                                ${plan.changes.length} task${plan.changes.length === 1 ? "" : "s"} will move. Durations are preserved.
                            </span>
                        </div>
                    </div>

                    <div class="task-cascade-change-list">
                        ${plan.changes.map(
                            (change) => `
                                <article class="task-cascade-change">
                                    <strong>
                                        ${escapeHtml(
                                            change.task.taskName ||
                                            "Production task"
                                        )}
                                    </strong>

                                    <span>
                                        ${escapeHtml(
                                            change.oldStart ||
                                            "Unscheduled"
                                        )}
                                        →
                                        ${escapeHtml(
                                            change.newStart
                                        )}
                                    </span>

                                    <span>
                                        ${escapeHtml(
                                            change.oldEnd ||
                                            "Unscheduled"
                                        )}
                                        →
                                        ${escapeHtml(
                                            change.newEnd
                                        )}
                                    </span>

                                    <small>
                                        ${escapeHtml(
                                            change.reason
                                        )}
                                    </small>
                                </article>
                            `
                        ).join("")}
                    </div>

                    ${
                        plan.warnings.length
                            ? `
                                <div class="task-cascade-warnings">
                                    ${plan.warnings.map(
                                        (warning) => `
                                            <span>
                                                ⚠ ${escapeHtml(
                                                    warning
                                                )}
                                            </span>
                                        `
                                    ).join("")}
                                </div>
                            `
                            : ""
                    }

                    <div class="task-cascade-actions">
                        <button
                            id="cancelCascadeButton"
                            class="task-cascade-button task-cascade-button--secondary"
                            type="button"
                        >
                            Cancel preview
                        </button>

                        <button
                            id="applyCascadeButton"
                            class="task-cascade-button task-cascade-button--primary"
                            type="button"
                        >
                            Apply schedule changes
                        </button>
                    </div>
                </div>
            `;

            element(
                "cancelCascadeButton"
            )?.addEventListener(
                "click",
                refreshCascadeControls
            );

            element(
                "applyCascadeButton"
            )?.addEventListener(
                "click",
                applyCascadeReschedule
            );

        } catch (error) {
            console.error(error);

            panel.hidden =
                false;

            panel.innerHTML = `
                <div class="task-cascade-error">
                    <strong>Unable to build schedule preview</strong>
                    <span>
                        ${escapeHtml(
                            error.message ||
                            "The schedule could not be calculated."
                        )}
                    </span>
                </div>
            `;
        }
    }


    async function applyCascadeReschedule() {
        const plan =
            state.cascadePreview;

        const panel =
            ensureCascadePanel();

        if (
            !plan ||
            !plan.changes.length ||
            !panel
        ) {
            return;
        }

        const applyButton =
            element(
                "applyCascadeButton"
            );

        if (applyButton) {
            applyButton.disabled =
                true;

            applyButton.textContent =
                "Applying…";
        }

        try {
            for (const change of plan.changes) {
                if (
                    change.task.status ===
                    "completed"
                ) {
                    continue;
                }

                await api(
                    `/admin/orders/${encodeURIComponent(
                        change.task.orderReference
                    )}/schedule/${Number(
                        change.task.id
                    )}`,
                    {
                        method:
                            "PATCH",

                        body:
                            JSON.stringify({
                                plannedStartDate:
                                    change.newStart,
                                plannedEndDate:
                                    change.newEnd
                            })
                    }
                );
            }

            panel.innerHTML = `
                <div class="task-cascade-success">
                    <strong>Schedule updated</strong>
                    <span>
                        Downstream production dates were shifted successfully.
                    </span>
                </div>
            `;

            await loadProductionSchedule();

            window.setTimeout(
                closeTaskPanel,
                500
            );

        } catch (error) {
            console.error(error);

            panel.innerHTML = `
                <div class="task-cascade-error">
                    <strong>Schedule update failed</strong>
                    <span>
                        ${escapeHtml(
                            error.message ||
                            "One or more tasks could not be rescheduled."
                        )}
                    </span>
                </div>
            `;
        }
    }


    function installScheduleConflictStyles() {
        if (
            document.getElementById(
                "productionScheduleConflictStyles"
            )
        ) {
            return;
        }

        const style =
            document.createElement(
                "style"
            );

        style.id =
            "productionScheduleConflictStyles";

        style.textContent = `
            .gantt-task-row.has-schedule-conflict {
                box-shadow: inset 3px 0 0 #b42318;
                background: rgba(180, 35, 24, 0.035);
            }

            .gantt-task-conflict {
                color: #b42318 !important;
                font-style: normal !important;
                font-weight: 700;
            }

            .gantt-bar.has-schedule-conflict {
                outline: 2px solid #b42318;
                outline-offset: 2px;
            }

            .gantt-bar__conflict-icon {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                flex: none;
                width: 16px;
                height: 16px;
                border-radius: 50%;
                color: #b42318;
                background: #fff;
                font-size: 10px;
                font-weight: 800;
            }

            .gantt-dependency-line.is-conflict {
                stroke: #b42318;
                stroke-width: 2;
                stroke-dasharray: 5 4;
            }

            .task-schedule-conflict {
                display: grid;
                gap: 5px;
                margin-top: 18px;
                padding: 13px 14px;
                border: 1px solid rgba(180, 35, 24, 0.28);
                border-radius: 8px;
                color: #8f1d14;
                background: rgba(180, 35, 24, 0.06);
                font-size: 12px;
                line-height: 1.55;
            }

            .task-schedule-conflict[hidden] {
                display: none !important;
            }

            .task-schedule-conflict strong {
                font-size: 11px;
                letter-spacing: 0.05em;
                text-transform: uppercase;
            }


            .task-cascade-panel {
                display: grid;
                gap: 12px;
                margin-top: 14px;
                padding: 14px;
                border: 1px solid rgba(103, 54, 41, 0.18);
                border-radius: 9px;
                background: rgba(103, 54, 41, 0.035);
                font-size: 12px;
                line-height: 1.5;
            }

            .task-cascade-panel[hidden] {
                display: none !important;
            }

            .task-cascade-panel__intro,
            .task-cascade-preview__header {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 14px;
            }

            .task-cascade-panel__intro > div,
            .task-cascade-preview__header > div,
            .task-cascade-empty,
            .task-cascade-error,
            .task-cascade-success {
                display: grid;
                gap: 4px;
            }

            .task-cascade-panel strong {
                color: #2e1c15;
            }

            .task-cascade-panel span,
            .task-cascade-panel small {
                color: #7f6d64;
            }

            .task-cascade-button {
                flex: none;
                min-height: 38px;
                padding: 8px 12px;
                border: 1px solid rgba(103, 54, 41, 0.28);
                border-radius: 7px;
                color: #673629;
                background: #fff;
                font: inherit;
                font-weight: 700;
                cursor: pointer;
            }

            .task-cascade-button--primary {
                color: #fff;
                border-color: #673629;
                background: #673629;
            }

            .task-cascade-button--secondary {
                background: transparent;
            }

            .task-cascade-button:disabled {
                opacity: 0.6;
                cursor: wait;
            }

            .task-cascade-change-list {
                display: grid;
                gap: 8px;
            }

            .task-cascade-change {
                display: grid;
                grid-template-columns: minmax(120px, 1.3fr) 1fr 1fr;
                gap: 5px 10px;
                padding: 10px 0;
                border-bottom: 1px solid rgba(103, 54, 41, 0.12);
            }

            .task-cascade-change small {
                grid-column: 1 / -1;
            }

            .task-cascade-warnings {
                display: grid;
                gap: 5px;
                padding: 10px;
                border-radius: 7px;
                color: #8a5a13;
                background: rgba(178, 122, 34, 0.08);
            }

            .task-cascade-actions {
                display: flex;
                justify-content: flex-end;
                gap: 8px;
                margin-top: 4px;
            }

            .task-cascade-error {
                color: #8f1d14;
            }

            .task-cascade-success {
                color: #2f6d49;
            }

            .gantt-bar {
                touch-action: none;
            }

            .gantt-bar:not([data-status="completed"]):not([data-status="cancelled"]) {
                cursor: grab;
            }

            .gantt-bar.is-gantt-dragging {
                z-index: 20;
                cursor: grabbing;
                opacity: 0.92;
                box-shadow: 0 8px 22px rgba(46, 28, 21, 0.24);
            }

            .gantt-resize-handle {
                position: absolute;
                top: 4px;
                bottom: 4px;
                z-index: 7;
                width: 9px;
                border-radius: 5px;
                opacity: 0;
                background: rgba(255,255,255,0.82);
                transition: opacity 120ms ease;
                cursor: ew-resize;
                touch-action: none;
            }

            .gantt-resize-handle--start {
                left: 3px;
            }

            .gantt-resize-handle--end {
                right: 3px;
            }

            .gantt-bar:hover .gantt-resize-handle,
            .gantt-bar:focus-visible .gantt-resize-handle,
            .gantt-bar.is-gantt-dragging .gantt-resize-handle {
                opacity: 1;
            }

            .gantt-bar[data-status="completed"] .gantt-resize-handle,
            .gantt-bar[data-status="cancelled"] .gantt-resize-handle {
                display: none;
            }

            body.is-gantt-interacting,
            body.is-gantt-interacting * {
                user-select: none !important;
            }

            @media (max-width: 620px) {
                .task-cascade-panel__intro,
                .task-cascade-preview__header {
                    flex-direction: column;
                }

                .task-cascade-button {
                    width: 100%;
                }

                .task-cascade-change {
                    grid-template-columns: 1fr;
                }

                .task-cascade-change small {
                    grid-column: auto;
                }

                .task-cascade-actions {
                    display: grid;
                    grid-template-columns: 1fr;
                }
            }
        `;

        document.head.appendChild(
            style
        );
    }


    function renderDependencyLines(
        rows,
        dayWidth
    ) {
        const existing =
            rows.querySelector(
                ".gantt-dependency-layer"
            );
    
        if (existing) {
            existing.remove();
        }
    
    
        const scheduledTasks =
            state.tasks.filter(
                (task) =>
                    task.plannedStartDate &&
                    task.plannedEndDate
            );
    
    
        const taskMap =
            new Map(
                scheduledTasks.map(
                    (task) => [
                        Number(task.id),
                        task
                    ]
                )
            );
    
    
        const dependentTasks =
            scheduledTasks.filter(
                (task) =>
                    task.dependencyTaskId &&
                    taskMap.has(
                        Number(
                            task.dependencyTaskId
                        )
                    )
            );
    
    
        if (!dependentTasks.length) {
            return;
        }
    
    
        const rowHeight =
            parseFloat(
                getComputedStyle(
                    document.documentElement
                ).getPropertyValue(
                    "--gantt-row-height"
                )
            ) || 70;
    
        const svg =
            document.createElementNS(
                "http://www.w3.org/2000/svg",
                "svg"
            );
    
    
        svg.classList.add(
            "gantt-dependency-layer"
        );
    
    
        svg.setAttribute(
            "width",
            rows.scrollWidth
        );
    
    
        svg.setAttribute(
            "height",
            rows.scrollHeight
        );
    
    
        svg.setAttribute(
            "viewBox",
            `0 0 ${rows.scrollWidth} ${rows.scrollHeight}`
        );
    
    
        dependentTasks.forEach(
            (task) => {
                const dependency =
                    taskMap.get(
                        Number(
                            task.dependencyTaskId
                        )
                    );
    
    
                if (!dependency) {
                    return;
                }
    
    
                const dependencyRow =
                    state.tasks.findIndex(
                        (candidate) =>
                            Number(candidate.id) ===
                            Number(dependency.id)
                    );
    
    
                const taskRow =
                    state.tasks.findIndex(
                        (candidate) =>
                            Number(candidate.id) ===
                            Number(task.id)
                    );
    
    
                if (
                    dependencyRow === -1 ||
                    taskRow === -1
                ) {
                    return;
                }
    
    
                const dependencyStart =
                    parseDate(
                        dependency.plannedStartDate
                    );
    
    
                const dependencyEnd =
                    parseDate(
                        dependency.plannedEndDate
                    );
    
    
                const taskStart =
                    parseDate(
                        task.plannedStartDate
                    );
    
    
                if (
                    !dependencyStart ||
                    !dependencyEnd ||
                    !taskStart
                ) {
                    return;
                }
    
    
                const dependencyEndOffset =
                    differenceInDays(
                        state.timeline?.start ||
                        getTimelineRange(
                            state.tasks
                        ).start,
                        dependencyEnd
                    );
    
    
                const taskStartOffset =
                    differenceInDays(
                        state.timeline?.start ||
                        getTimelineRange(
                            state.tasks
                        ).start,
                        taskStart
                    );
    
    
                const startX =
                    (
                        dependencyEndOffset +
                        1
                    ) *
                    dayWidth;
    
    
                const endX =
                    taskStartOffset *
                    dayWidth;
    
    
                const startY =
                    dependencyRow *
                    rowHeight +
                    rowHeight / 2;
    
    
                const endY =
                    taskRow *
                    rowHeight +
                    rowHeight / 2;
    
    
                drawDependencyConnector(
                    svg,
                    {
                        startX,
                        startY,
                        endX,
                        endY,
                        isConflict:
                            Boolean(
                                getDependencyConflict(
                                    task
                                )
                            )
                    }
                );
            }
        );
    
    
        rows.appendChild(svg);

        const defs =
            document.createElementNS(
                "http://www.w3.org/2000/svg",
                "defs"
            );


        const marker =
            document.createElementNS(
                "http://www.w3.org/2000/svg",
                "marker"
            );


        marker.setAttribute(
            "id",
            "ganttDependencyArrow"
        );

        marker.setAttribute(
            "markerWidth",
            "7"
        );

        marker.setAttribute(
            "markerHeight",
            "7"
        );

        marker.setAttribute(
            "refX",
            "6"
        );

        marker.setAttribute(
            "refY",
            "3"
        );

        marker.setAttribute(
            "orient",
            "auto"
        );


        const arrow =
            document.createElementNS(
                "http://www.w3.org/2000/svg",
                "path"
            );


        arrow.setAttribute(
            "d",
            "M 0 0 L 6 3 L 0 6 Z"
        );


        arrow.setAttribute(
            "class",
            "gantt-dependency-arrow"
        );


        marker.appendChild(
            arrow
        );


        defs.appendChild(
            marker
        );


        svg.appendChild(
            defs
        );
            }


    /* ==================================================
       GANTT
    ================================================== */

    function renderGantt() {
        const sidebar =
            element(
                "ganttTaskRows"
            );

        const header =
            element(
                "ganttHeader"
            );

        const rows =
            element(
                "ganttRows"
            );

        const empty =
            element(
                "ganttEmpty"
            );

        sidebar.innerHTML = "";
        header.innerHTML = "";
        rows.innerHTML = "";


        if (!state.tasks.length) {
            empty.hidden =
                false;

            state.timeline =
                null;

            header.style.width =
                "";

            rows.style.width =
                "";

            return;
        }


        empty.hidden =
            true;


        const range =
            getTimelineRange(
                state.tasks
            );

        const dayWidth =
            getDayWidth();

        const numberOfDays =
            differenceInDays(
                range.start,
                range.end
            ) + 1;

        const timelineWidth =
            numberOfDays *
            dayWidth;

        document.documentElement
            .style
            .setProperty(
                "--gantt-day-width",
                `${dayWidth}px`
            );


        /* ----------------------------------------------
           LEFT TASK LIST
        ---------------------------------------------- */

        sidebar.innerHTML =
            state.tasks
                .map(
                    (task) => {
                        const conflict =
                            getDependencyConflict(
                                task
                            );

                        return `
                        <article
                            class="gantt-task-row ${
                                conflict
                                    ? "has-schedule-conflict"
                                    : ""
                            }"
                            data-task-id="${task.id}"
                        >
                            <strong>
                                ${escapeHtml(
                                    task.taskName
                                )}
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

                            ${
                                task.dependencyTaskName
                                    ? `
                                        <small class="gantt-task-dependency">
                                            ↳ After ${escapeHtml(
                                                task.dependencyTaskName
                                            )}
                                        </small>
                                    `
                                    : ""
                            }
                        ${
                            conflict
                                ? `
                                    <small class="gantt-task-conflict">
                                        ⚠ Schedule conflict
                                    </small>
                                `
                                : ""
                        }
                        </article>
                    `;
                    }
                )
                .join("");


        /* ----------------------------------------------
           DATE HEADER
        ---------------------------------------------- */

        const headerDays =
            [];

        const today =
            startOfDay(
                new Date()
            );


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
                    today,
                    date
                ) === 0;


            headerDays.push(`
                <div
                    class="
                        gantt-date-cell
                        ${
                            isToday
                                ? "is-today"
                                : ""
                        }
                    "
                    style="
                        width: ${dayWidth}px;
                        min-width: ${dayWidth}px;
                    "
                >
                    ${escapeHtml(
                        formatTimelineDate(
                            date
                        )
                    )}
                </div>
            `);
        }


        header.style.width =
            `${timelineWidth}px`;

        header.innerHTML =
            headerDays.join("");


        /* ----------------------------------------------
           BARS
        ---------------------------------------------- */

        rows.style.width =
            `${timelineWidth}px`;


        rows.innerHTML =
            state.tasks
                .map(
                    (task) => {
                        const conflict =
                            getDependencyConflict(
                                task
                            );

                        const start =
                            parseDate(
                                task.plannedStartDate
                            );

                        const end =
                            parseDate(
                                task.plannedEndDate
                            );


                        if (
                            !start ||
                            !end
                        ) {
                            return `
                                <div
                                    class="gantt-row"
                                    data-task-id="${task.id}"
                                >
                                    <button
                                        type="button"
                                        class="gantt-unscheduled"
                                        data-task-id="${task.id}"
                                    >
                                        Unscheduled
                                    </button>
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
                            offsetDays *
                            dayWidth;


                        const width =
                            Math.max(
                                dayWidth,
                                durationDays *
                                dayWidth
                            );


                        const progress =
                            Math.min(
                                100,
                                Math.max(
                                    0,
                                    Number(
                                        task.progress ||
                                        0
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
                                    class="gantt-bar ${
                                        conflict
                                            ? "has-schedule-conflict"
                                            : ""
                                    }"
                                    data-task-id="${task.id}"
                                    data-status="${escapeHtml(
                                        task.status
                                    )}"
                                    style="
                                        left: ${left}px;
                                        width: ${width}px;
                                    "
                                    title="${escapeHtml(
                                        conflict
                                            ? conflict.message
                                            : task.taskName
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

                                        ${
                                            conflict
                                                ? `
                                                    <b
                                                        class="gantt-bar__conflict-icon"
                                                        aria-label="Schedule conflict"
                                                    >
                                                        !
                                                    </b>
                                                `
                                                : ""
                                        }

                                        <small>
                                            ${progress}%
                                        </small>

                                    </span>

                                    <span
                                        class="gantt-resize-handle gantt-resize-handle--start"
                                        data-resize="start"
                                        aria-hidden="true"
                                    ></span>

                                    <span
                                        class="gantt-resize-handle gantt-resize-handle--end"
                                        data-resize="end"
                                        aria-hidden="true"
                                    ></span>

                                </button>
                            </div>
                        `;
                    }
                )
                .join("");
        
        renderDependencyLines(
            rows,
            dayWidth
        );


        /* ----------------------------------------------
           TODAY LINE
        ---------------------------------------------- */

        const todayOffset =
            differenceInDays(
                range.start,
                today
            );


        if (
            todayOffset >= 0 &&
            todayOffset <
            numberOfDays
        ) {
            const line =
                document.createElement(
                    "div"
                );

            line.className =
                "gantt-today-line";

            line.style.left =
                `${
                    todayOffset *
                    dayWidth +
                    dayWidth / 2
                }px`;

            rows.appendChild(
                line
            );
        }


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
            element(
                "ganttTimeline"
            );

        const today =
            startOfDay(
                new Date()
            );

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
                timeline.clientWidth /
                3
            );
    }


    /* ==================================================
       TASK LOOKUP
    ================================================== */

    function findTask(
        taskId
    ) {
        return state.tasks.find(
            (task) =>
                Number(task.id) ===
                Number(taskId)
        );
    }


    /* ==================================================
       ORDER SELECTOR
    ================================================== */

    function getOrderReference(order) {
        return (
            order?.order_reference ||
            order?.orderReference ||
            ""
        );
    }


    function getOrderDisplayName(order) {
        return (
            order?.brand_name ||
            order?.brandName ||
            order?.customer_name ||
            order?.customerName ||
            "Customer"
        );
    }


    function populateOrderOptions(
        selectedReference = "",
        fallbackOrder = null
    ) {
        const select =
            element(
                "taskOrder"
            );

        const orders =
            [...state.orders];

        /*
         * The active-order endpoint is the normal source for
         * this selector. When editing, keep the task's linked
         * order visible even if it is not returned by that list.
         */
        if (
            selectedReference &&
            !orders.some(
                (order) =>
                    getOrderReference(order) ===
                    selectedReference
            )
        ) {
            orders.unshift(
                fallbackOrder || {
                    order_reference:
                        selectedReference,
                    customer_name:
                        "Current order"
                }
            );
        }

        select.innerHTML = `
            <option value="">
                Select an order
            </option>

            ${
                orders
                    .map(
                        (order) => {
                            const reference =
                                getOrderReference(order);

                            const name =
                                getOrderDisplayName(order);

                            const selected =
                                reference ===
                                selectedReference
                                    ? "selected"
                                    : "";

                            return `
                                <option
                                    value="${escapeHtml(
                                        reference
                                    )}"
                                    ${selected}
                                >
                                    ${escapeHtml(
                                        reference
                                    )}
                                    —
                                    ${escapeHtml(
                                        name
                                    )}
                                </option>
                            `;
                        }
                    )
                    .join("")
            }
        `;

        /*
         * Setting .value after rebuilding the options protects
         * the selected order from being lost when innerHTML is
         * replaced.
         */
        select.value =
            selectedReference ||
            "";
    }


    /* ==================================================
       ORDER ITEMS
    ================================================== */

    async function loadOrderItems(
        orderReference,
        selectedItemId = null
    ) {
        const select =
            element(
                "taskOrderItem"
            );


        if (!orderReference) {
            select.innerHTML = `
                <option value="">
                    Entire order / general task
                </option>
            `;

            select.disabled =
                true;

            return;
        }


        select.disabled =
            true;


        select.innerHTML = `
            <option value="">
                Loading order items…
            </option>
        `;


        try {
            let order =
                state.orderDetails.get(
                    orderReference
                );


            if (!order) {
                const data =
                    await api(
                        `/admin/orders/${encodeURIComponent(
                            orderReference
                        )}`
                    );


                order =
                    data.order;


                state.orderDetails.set(
                    orderReference,
                    order
                );
            }


            const items =
                order?.items ||
                [];


            select.innerHTML = `
                <option value="">
                    Entire order / general task
                </option>

                ${
                    items
                        .map(
                            (item) => {
                                const selected =
                                    Number(
                                        item.id
                                    ) ===
                                    Number(
                                        selectedItemId
                                    )
                                        ? "selected"
                                        : "";


                                return `
                                    <option
                                        value="${item.id}"
                                        ${selected}
                                    >
                                        ${escapeHtml(
                                            item.description
                                        )}

                                        ${
                                            item.quantity
                                                ? ` — ${escapeHtml(
                                                    item.quantity
                                                )} units`
                                                : ""
                                        }
                                    </option>
                                `;
                            }
                        )
                        .join("")
                }
            `;


            select.disabled =
                false;

        } catch (error) {
            console.error(
                error
            );


            select.innerHTML = `
                <option value="">
                    Unable to load order items
                </option>
            `;


            select.disabled =
                true;
        }
    }


    /* ==================================================
       TASK PANEL
    ================================================== */

    function showTaskPanel() {
        element(
            "taskBackdrop"
        ).hidden =
            false;


        element(
            "taskPanel"
        )
            .classList
            .add(
                "is-open"
            );


        element(
            "taskPanel"
        )
            .setAttribute(
                "aria-hidden",
                "false"
            );
    }


    function closeTaskPanel() {
        element(
            "taskPanel"
        )
            .classList
            .remove(
                "is-open"
            );


        element(
            "taskPanel"
        )
            .setAttribute(
                "aria-hidden",
                "true"
            );


        element(
            "taskBackdrop"
        ).hidden =
            true;


        element(
            "taskFormMessage"
        ).textContent =
            "";


        clearCascadePreview();

        const cascadePanel =
            element(
                "taskCascadePanel"
            );

        if (cascadePanel) {
            cascadePanel.hidden =
                true;
        }

        state.editingTaskId =
            null;
    }


    function resetTaskForm() {
        element(
            "taskId"
        ).value = "";


        element(
            "taskOrderReference"
        ).value = "";


        element(
            "taskOrder"
        ).value = "";


        element(
            "taskName"
        ).value = "";


        element(
            "taskStatus"
        ).value =
            "not_started";


        element(
            "taskPriority"
        ).value =
            "normal";


        element(
            "taskPlannedStart"
        ).value = "";


        element(
            "taskPlannedEnd"
        ).value = "";


        element(
            "taskAssignedTo"
        ).value = "";


        element(
            "taskProgress"
        ).value =
            "0";


        element(
            "taskProgressValue"
        ).textContent =
            "0%";


        element(
            "taskNotes"
        ).value = "";


        element(
            "taskFormMessage"
        ).textContent =
            "";

        element("taskDependency").innerHTML = `
            <option value="">
                No dependency
            </option>
        `;
        
        element("taskDependency").disabled =
            true;
    }


    async function openTaskPanel(
        task
    ) {
        if (!task) {
            return;
        }


        state.taskPanelMode =
            "edit";


        state.editingTaskId =
            Number(
                task.id
            );


        /*
         * Show the linked order while editing, but do not let an
         * existing task move to a different parent order.
         */
        element(
            "taskOrderField"
        ).hidden =
            false;


        element(
            "taskOrder"
        ).disabled =
            true;


        element(
            "taskOrderItemField"
        ).hidden =
            false;


        element(
            "deleteTaskButton"
        ).hidden =
            false;


        element(
            "taskId"
        ).value =
            task.id;


        element(
            "taskOrderReference"
        ).value =
            task.orderReference;


        element(
            "taskPanelTitle"
        ).textContent =
            task.taskName;


        element(
            "taskPanelReference"
        ).textContent =
            [
                task.orderReference,
                task.brandName,
                task.itemDescription
            ]
                .filter(Boolean)
                .join(" · ");


        element(
            "taskName"
        ).value =
            task.taskName ||
            "";


        element(
            "taskStatus"
        ).value =
            task.status ||
            "not_started";


        element(
            "taskPriority"
        ).value =
            task.priority ||
            "normal";


        element(
            "taskPlannedStart"
        ).value =
            task.plannedStartDate ||
            "";


        element(
            "taskPlannedEnd"
        ).value =
            task.plannedEndDate ||
            "";


        element(
            "taskAssignedTo"
        ).value =
            task.assignedTo ||
            "";


        element(
            "taskProgress"
        ).value =
            Number(
                task.progress ||
                0
            );


        element(
            "taskProgressValue"
        ).textContent =
            `${Number(
                task.progress ||
                0
            )}%`;


        element(
            "taskNotes"
        ).value =
            task.notes ||
            "";


        element(
            "taskFormMessage"
        ).textContent =
            "";


        /*
         * Build the order selector BEFORE assigning its selected
         * value. Previously the edit flow never populated this
         * selector, leaving it on "Select an order".
         */
        element(
            "taskOrder"
        ).innerHTML = `
            <option value="">
                Loading order…
            </option>
        `;


        const fallbackOrder = {
            order_reference:
                task.orderReference,
            brand_name:
                task.brandName ||
                "",
            customer_name:
                task.customerName ||
                ""
        };


        try {
            await loadActiveOrders();

            populateOrderOptions(
                task.orderReference,
                fallbackOrder
            );

        } catch (error) {
            console.error(
                error
            );

            /*
             * Even if the active-order list fails, retain the
             * task's known parent order in the editor.
             */
            state.orders =
                [];

            populateOrderOptions(
                task.orderReference,
                fallbackOrder
            );
        }


        showTaskPanel();


        await loadOrderItems(
            task.orderReference,
            task.orderItemId
        );


        populateDependencyOptions(
            task.orderReference,
            task.dependencyTaskId,
            task.id
        );


        refreshScheduleConflictNotice();
    }


    /* ==================================================
       CREATE TASK
    ================================================== */

    async function openCreateTaskPanel() {
        element("taskDependency").innerHTML = `
            <option value="">
                Select an order first
            </option>
        `;

        element("taskDependency").disabled =
            true;
        state.taskPanelMode =
            "create";


        state.editingTaskId =
            null;


        resetTaskForm();


        element(
            "taskOrderField"
        ).hidden =
            false;


        element(
            "taskOrder"
        ).disabled =
            false;


        element(
            "taskOrderItemField"
        ).hidden =
            false;


        element(
            "deleteTaskButton"
        ).hidden =
            true;


        element(
            "taskPanelTitle"
        ).textContent =
            "New production task";


        element(
            "taskPanelReference"
        ).textContent =
            "Add work to an active production order.";


        element(
            "taskOrder"
        ).innerHTML = `
            <option value="">
                Loading active orders…
            </option>
        `;


        element(
            "taskOrderItem"
        ).innerHTML = `
            <option value="">
                Select an order first
            </option>
        `;


        element(
            "taskOrderItem"
        ).disabled =
            true;


        showTaskPanel();


        refreshScheduleConflictNotice();


        try {
            await loadActiveOrders();


            populateOrderOptions();


            if (
                !state.orders.length
            ) {
                element(
                    "taskFormMessage"
                ).textContent =
                    "There are no active orders available.";

                return;
            }


            element(
                "taskOrder"
            ).focus();

        } catch (error) {
            console.error(
                error
            );


            element(
                "taskFormMessage"
            ).textContent =
                error.message;
        }
    }


    /* ==================================================
       SELECTED ORDER ITEM
    ================================================== */

    function selectedOrderItemId() {
        const select =
            element(
                "taskOrderItem"
            );


        if (
            select.disabled
        ) {
            const currentTask =
                findTask(
                    state.editingTaskId
                );


            return (
                state.taskPanelMode ===
                "edit"
            )
                ? currentTask
                    ?.orderItemId ??
                    null
                : null;
        }


        return select.value
            ? Number(
                select.value
            )
            : null;
    }


    /* ==================================================
       SAVE TASK
    ================================================== */

    async function saveTask(
        event
    ) {
        event.preventDefault();


        const message =
            element(
                "taskFormMessage"
            );


        const taskName =
            element(
                "taskName"
            )
                .value
                .trim();


        const plannedStartDate =
            element(
                "taskPlannedStart"
            ).value;


        const plannedEndDate =
            element(
                "taskPlannedEnd"
            ).value;


        if (!taskName) {
            message.textContent =
                "Enter a task name.";


            element(
                "taskName"
            ).focus();

            return;
        }


        if (
            plannedStartDate &&
            plannedEndDate &&
            plannedEndDate <
            plannedStartDate
        ) {
            message.textContent =
                "Planned end date cannot be before the start date.";


            element(
                "taskPlannedEnd"
            ).focus();

            return;
        }
        const dependencyValue =
            element("taskDependency").value;

        const dependencyTaskId =
            dependencyValue
                ? Number(dependencyValue)
                : null;


        const payload = {
            taskName,
        
            orderItemId:
                selectedOrderItemId(),
        
            dependencyTaskId,
        
            status:
                element("taskStatus").value,
        
            priority:
                element("taskPriority").value,
        
            plannedStartDate:
                plannedStartDate || null,
        
            plannedEndDate:
                plannedEndDate || null,
        
            assignedTo:
                element("taskAssignedTo")
                    .value
                    .trim() || null,
        
            progress:
                Number(
                    element("taskProgress").value
                ),
        
            notes:
                element("taskNotes")
                    .value
                    .trim() || null
        };


        try {
            if (
                state.taskPanelMode ===
                "create"
            ) {
                const orderReference =
                    element(
                        "taskOrder"
                    ).value;


                if (
                    !orderReference
                ) {
                    message.textContent =
                        "Select the order this task belongs to.";


                    element(
                        "taskOrder"
                    ).focus();

                    return;
                }


                message.textContent =
                    "Creating task…";


                await api(
                    `/admin/orders/${encodeURIComponent(
                        orderReference
                    )}/schedule`,
                    {
                        method:
                            "POST",

                        body:
                            JSON.stringify(
                                payload
                            )
                    }
                );


                message.textContent =
                    "Task created.";

            } else {
                const taskId =
                    Number(
                        element(
                            "taskId"
                        ).value
                    );


                const orderReference =
                    element(
                        "taskOrderReference"
                    ).value;


                if (
                    !taskId ||
                    !orderReference
                ) {
                    throw new Error(
                        "Unable to identify this production task."
                    );
                }


                message.textContent =
                    "Saving task…";


                await api(
                    `/admin/orders/${encodeURIComponent(
                        orderReference
                    )}/schedule/${taskId}`,
                    {
                        method:
                            "PATCH",

                        body:
                            JSON.stringify(
                                payload
                            )
                    }
                );


                message.textContent =
                    "Task saved.";
            }


            await loadProductionSchedule();


            window.setTimeout(
                closeTaskPanel,
                250
            );

        } catch (error) {
            console.error(
                error
            );


            message.textContent =
                error.message ||
                "Unable to save task.";
        }
    }


    /* ==================================================
       DELETE TASK
    ================================================== */

    async function deleteTask() {
        const taskId =
            Number(
                element(
                    "taskId"
                ).value
            );


        const orderReference =
            element(
                "taskOrderReference"
            ).value;


        if (
            !taskId ||
            !orderReference
        ) {
            return;
        }


        const task =
            findTask(
                taskId
            );


        const confirmed =
            window.confirm(
                `Delete "${
                    task?.taskName ||
                    "this production task"
                }"?`
            );


        if (!confirmed) {
            return;
        }


        const message =
            element(
                "taskFormMessage"
            );


        try {
            message.textContent =
                "Deleting task…";


            await api(
                `/admin/orders/${encodeURIComponent(
                    orderReference
                )}/schedule/${taskId}`,
                {
                    method:
                        "DELETE"
                }
            );


            closeTaskPanel();


            await loadProductionSchedule();

        } catch (error) {
            console.error(
                error
            );


            message.textContent =
                error.message;
        }
    }


    /* ==================================================
       GANTT DRAG + RESIZE
    ================================================== */

    function clampNumber(
        value,
        minimum,
        maximum
    ) {
        return Math.min(
            maximum,
            Math.max(
                minimum,
                value
            )
        );
    }


    function taskDurationDays(
        task
    ) {
        const start =
            parseDate(
                task?.plannedStartDate
            );

        const end =
            parseDate(
                task?.plannedEndDate
            );

        if (!start || !end) {
            return 1;
        }

        return Math.max(
            1,
            differenceInDays(
                start,
                end
            ) + 1
        );
    }


    function canMoveTaskOnGantt(
        task
    ) {
        return Boolean(
            task &&
            task.plannedStartDate &&
            task.plannedEndDate &&
            ![
                "completed",
                "cancelled"
            ].includes(
                task.status
            )
        );
    }


    async function persistGanttDates(
        task,
        plannedStartDate,
        plannedEndDate
    ) {
        if (
            !task?.id ||
            !task?.orderReference
        ) {
            throw new Error(
                "Unable to identify this production task."
            );
        }

        await api(
            `/admin/orders/${encodeURIComponent(
                task.orderReference
            )}/schedule/${task.id}`,
            {
                method: "PATCH",

                body: JSON.stringify({
                    plannedStartDate,
                    plannedEndDate
                })
            }
        );
    }


    function beginGanttInteraction(
        event
    ) {
        if (
            event.button !== undefined &&
            event.button !== 0
        ) {
            return;
        }

        const bar =
            event.target.closest(
                ".gantt-bar"
            );

        if (!bar) {
            return;
        }

        const task =
            findTask(
                bar.dataset.taskId
            );

        if (
            !canMoveTaskOnGantt(
                task
            )
        ) {
            return;
        }

        const resizeHandle =
            event.target.closest(
                ".gantt-resize-handle"
            );

        const mode =
            resizeHandle
                ? resizeHandle.dataset.resize
                : "move";

        const startDate =
            parseDate(
                task.plannedStartDate
            );

        const endDate =
            parseDate(
                task.plannedEndDate
            );

        if (!startDate || !endDate) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        const dayWidth =
            state.timeline?.dayWidth ||
            getDayWidth();

        state.ganttInteraction = {
            pointerId:
                event.pointerId,

            task,
            bar,
            mode,

            startClientX:
                event.clientX,

            startDate,
            endDate,

            originalLeft:
                parseFloat(
                    bar.style.left
                ) || 0,

            originalWidth:
                parseFloat(
                    bar.style.width
                ) ||
                dayWidth,

            dayWidth,
            dayDelta: 0,
            moved: false
        };

        bar.classList.add(
            "is-gantt-dragging"
        );

        document.body.classList.add(
            "is-gantt-interacting"
        );

        if (
            typeof bar.setPointerCapture ===
                "function" &&
            event.pointerId !== undefined
        ) {
            try {
                bar.setPointerCapture(
                    event.pointerId
                );
            } catch (_) {
                // Pointer capture is optional.
            }
        }
    }


    function updateGanttInteraction(
        event
    ) {
        const interaction =
            state.ganttInteraction;

        if (!interaction) {
            return;
        }

        if (
            interaction.pointerId !== undefined &&
            event.pointerId !== undefined &&
            interaction.pointerId !==
                event.pointerId
        ) {
            return;
        }

        const pixelDelta =
            event.clientX -
            interaction.startClientX;

        const dayDelta =
            Math.round(
                pixelDelta /
                interaction.dayWidth
            );

        if (
            dayDelta ===
            interaction.dayDelta
        ) {
            return;
        }

        interaction.dayDelta =
            dayDelta;

        interaction.moved =
            interaction.moved ||
            dayDelta !== 0;

        const minimumWidth =
            interaction.dayWidth;

        if (
            interaction.mode ===
            "move"
        ) {
            interaction.bar.style.left =
                `${
                    interaction.originalLeft +
                    dayDelta *
                    interaction.dayWidth
                }px`;

            return;
        }

        if (
            interaction.mode ===
            "start"
        ) {
            const duration =
                taskDurationDays(
                    interaction.task
                );

            const safeDelta =
                clampNumber(
                    dayDelta,
                    -(9999),
                    duration - 1
                );

            interaction.dayDelta =
                safeDelta;

            interaction.bar.style.left =
                `${
                    interaction.originalLeft +
                    safeDelta *
                    interaction.dayWidth
                }px`;

            interaction.bar.style.width =
                `${Math.max(
                    minimumWidth,
                    interaction.originalWidth -
                    safeDelta *
                    interaction.dayWidth
                )}px`;

            return;
        }

        if (
            interaction.mode ===
            "end"
        ) {
            const duration =
                taskDurationDays(
                    interaction.task
                );

            const safeDelta =
                Math.max(
                    -(duration - 1),
                    dayDelta
                );

            interaction.dayDelta =
                safeDelta;

            interaction.bar.style.width =
                `${Math.max(
                    minimumWidth,
                    interaction.originalWidth +
                    safeDelta *
                    interaction.dayWidth
                )}px`;
        }
    }


    async function finishGanttInteraction(
        event
    ) {
        const interaction =
            state.ganttInteraction;

        if (!interaction) {
            return;
        }

        if (
            interaction.pointerId !== undefined &&
            event.pointerId !== undefined &&
            interaction.pointerId !==
                event.pointerId
        ) {
            return;
        }

        state.ganttInteraction =
            null;

        interaction.bar.classList.remove(
            "is-gantt-dragging"
        );

        document.body.classList.remove(
            "is-gantt-interacting"
        );

        if (!interaction.moved) {
            return;
        }

        state.suppressTaskClickUntil =
            Date.now() + 350;

        let newStart =
            new Date(
                interaction.startDate
            );

        let newEnd =
            new Date(
                interaction.endDate
            );

        if (
            interaction.mode ===
            "move"
        ) {
            newStart =
                addDays(
                    newStart,
                    interaction.dayDelta
                );

            newEnd =
                addDays(
                    newEnd,
                    interaction.dayDelta
                );
        }

        if (
            interaction.mode ===
            "start"
        ) {
            newStart =
                addDays(
                    newStart,
                    interaction.dayDelta
                );

            if (newStart > newEnd) {
                newStart =
                    new Date(
                        newEnd
                    );
            }
        }

        if (
            interaction.mode ===
            "end"
        ) {
            newEnd =
                addDays(
                    newEnd,
                    interaction.dayDelta
                );

            if (newEnd < newStart) {
                newEnd =
                    new Date(
                        newStart
                    );
            }
        }

        const plannedStartDate =
            localDateString(
                newStart
            );

        const plannedEndDate =
            localDateString(
                newEnd
            );

        const message =
            element(
                "productionMessage"
            );

        try {
            message.textContent =
                "Saving schedule change…";

            await persistGanttDates(
                interaction.task,
                plannedStartDate,
                plannedEndDate
            );

            await loadProductionSchedule();

            const refreshedTask =
                findTask(
                    interaction.task.id
                );

            const downstream =
                refreshedTask
                    ? state.tasks.filter(
                        (task) =>
                            Number(task.dependencyTaskId) ===
                            Number(refreshedTask.id)
                    )
                    : [];

            if (
                downstream.length
            ) {
                message.textContent =
                    "Schedule updated. Review any downstream conflicts before continuing.";
            } else {
                message.textContent =
                    "Schedule updated.";
            }

            window.setTimeout(
                () => {
                    if (
                        message.textContent ===
                            "Schedule updated." ||
                        message.textContent ===
                            "Schedule updated. Review any downstream conflicts before continuing."
                    ) {
                        message.textContent =
                            "";
                    }
                },
                2200
            );

        } catch (error) {
            console.error(
                error
            );

            message.textContent =
                error.message ||
                "Unable to update the production schedule.";

            renderGantt();
        }
    }


    function cancelGanttInteraction() {
        const interaction =
            state.ganttInteraction;

        if (!interaction) {
            return;
        }

        interaction.bar.classList.remove(
            "is-gantt-dragging"
        );

        document.body.classList.remove(
            "is-gantt-interacting"
        );

        state.ganttInteraction =
            null;

        renderGantt();
    }


    /* ==================================================
       CLICK TASK
    ================================================== */

    function openTaskFromTarget(
        target
    ) {
        if (
            Date.now() <
            state.suppressTaskClickUntil
        ) {
            return;
        }

        const clickable =
            target.closest(
                `
                    .gantt-bar,
                    .gantt-unscheduled,
                    .gantt-task-row
                `
            );


        if (!clickable) {
            return;
        }


        const task =
            findTask(
                clickable
                    .dataset
                    .taskId
            );


        openTaskPanel(
            task
        );
    }

    function populateDependencyOptions(
        orderReference,
        selectedDependencyId = null,
        currentTaskId = null
    ) {
        const select =
            element("taskDependency");
    
        const availableTasks =
            state.tasks.filter(
                (task) =>
                    task.orderReference ===
                        orderReference &&
                    Number(task.id) !==
                        Number(currentTaskId)
            );
    
        select.innerHTML = `
            <option value="">
                No dependency
            </option>
    
            ${
                availableTasks
                    .map((task) => {
                        const selected =
                            Number(task.id) ===
                            Number(selectedDependencyId)
                                ? "selected"
                                : "";
    
                        return `
                            <option
                                value="${task.id}"
                                ${selected}
                            >
                                ${escapeHtml(
                                    task.taskName
                                )}
                            </option>
                        `;
                    })
                    .join("")
            }
        `;
    
        select.disabled =
            !orderReference;
    }

    function drawDependencyConnector(
        svg,
        {
            startX,
            startY,
            endX,
            endY,
            isConflict = false
        }
    ) {
        const namespace =
            "http://www.w3.org/2000/svg";
    
    
        const path =
            document.createElementNS(
                namespace,
                "path"
            );
    
    
        const horizontalGap =
            14;
    
    
        let pathData;
    
    
        if (
            endX >
            startX + horizontalGap * 2
        ) {
            const middleX =
                startX +
                Math.max(
                    horizontalGap,
                    (
                        endX -
                        startX
                    ) / 2
                );
    
    
            pathData = `
                M ${startX} ${startY}
                H ${middleX}
                V ${endY}
                H ${endX}
            `;
        } else {
            /*
             * Dependency ends very close to,
             * or after, the dependent task.
             *
             * Route the connector around the
             * bars instead of directly through
             * them.
             */
    
            const routeX =
                Math.max(
                    startX,
                    endX
                ) +
                18;
    
    
            pathData = `
                M ${startX} ${startY}
                H ${routeX}
                V ${endY}
                H ${endX}
            `;
        }
    
    
        path.setAttribute(
            "d",
            pathData.replace(
                /\s+/g,
                " "
            ).trim()
        );
    
    
        path.setAttribute(
            "class",
            `gantt-dependency-line${
                isConflict
                    ? " is-conflict"
                    : ""
            }`
        );
    
    
        path.setAttribute(
            "marker-end",
            "url(#ganttDependencyArrow)"
        );
    
    
        svg.appendChild(
            path
        );
    }


    /* ==================================================
       EVENT LISTENERS
    ================================================== */

    let searchTimer;


    element(
        "productionSearch"
    )
        .addEventListener(
            "input",
            () => {
                clearTimeout(
                    searchTimer
                );


                searchTimer =
                    setTimeout(
                        loadProductionSchedule,
                        300
                    );
            }
        );


    element(
        "taskStatusFilter"
    )
        .addEventListener(
            "change",
            loadProductionSchedule
        );


    element(
        "assigneeFilter"
    )
        .addEventListener(
            "input",
            () => {
                clearTimeout(
                    searchTimer
                );


                searchTimer =
                    setTimeout(
                        loadProductionSchedule,
                        300
                    );
            }
        );


    element(
        "timelineScale"
    )
        .addEventListener(
            "change",
            (event) => {
                state.scale =
                    event
                        .target
                        .value;


                renderGantt();
            }
        );


    element(
        "refreshButton"
    )
        .addEventListener(
            "click",
            loadProductionSchedule
        );


    element(
        "todayButton"
    )
        .addEventListener(
            "click",
            scrollTimelineToToday
        );


    element(
        "newTaskButton"
    )
        .addEventListener(
            "click",
            openCreateTaskPanel
        );


    element(
        "ganttRows"
    )
        .addEventListener(
            "click",
            (event) => {
                openTaskFromTarget(
                    event.target
                );
            }
        );


    element(
        "ganttTaskRows"
    )
        .addEventListener(
            "click",
            (event) => {
                openTaskFromTarget(
                    event.target
                );
            }
        );


    element(
        "ganttRows"
    )
        .addEventListener(
            "pointerdown",
            beginGanttInteraction
        );


    window.addEventListener(
        "pointermove",
        updateGanttInteraction,
        {
            passive: true
        }
    );


    window.addEventListener(
        "pointerup",
        finishGanttInteraction
    );


    window.addEventListener(
        "pointercancel",
        cancelGanttInteraction
    );


    /*
     * Important:
     * this listener is registered ONCE.
     *
     * In your old file it was being
     * registered each time the create
     * drawer opened.
     */
    element("taskOrder")
        .addEventListener(
            "change",
            async () => {
                const orderReference =
                    element("taskOrder").value;

                await loadOrderItems(
                    orderReference
                );

                populateDependencyOptions(
                    orderReference
                );

                refreshScheduleConflictNotice();
            }
        );


    element(
        "taskDependency"
    )
        .addEventListener(
            "change",
            refreshScheduleConflictNotice
        );


    element(
        "taskPlannedStart"
    )
        .addEventListener(
            "change",
            refreshScheduleConflictNotice
        );


    element(
        "taskPlannedEnd"
    )
        .addEventListener(
            "change",
            refreshScheduleConflictNotice
        );


    element(
        "taskName"
    )
        .addEventListener(
            "input",
            refreshScheduleConflictNotice
        );


    element(
        "taskProgress"
    )
        .addEventListener(
            "input",
            () => {
                element(
                    "taskProgressValue"
                ).textContent =
                    `${
                        element(
                            "taskProgress"
                        ).value
                    }%`;
            }
        );


    element(
        "taskForm"
    )
        .addEventListener(
            "submit",
            saveTask
        );


    element(
        "deleteTaskButton"
    )
        .addEventListener(
            "click",
            deleteTask
        );


    element(
        "closeTaskPanel"
    )
        .addEventListener(
            "click",
            closeTaskPanel
        );


    element(
        "cancelTaskButton"
    )
        .addEventListener(
            "click",
            closeTaskPanel
        );


    element(
        "taskBackdrop"
    )
        .addEventListener(
            "click",
            closeTaskPanel
        );


    document
        .addEventListener(
            "keydown",
            (event) => {
                if (
                    event.key ===
                    "Escape" &&
                    state.ganttInteraction
                ) {
                    cancelGanttInteraction();
                    return;
                }

                if (
                    event.key ===
                        "Escape" &&
                    element(
                        "taskPanel"
                    )
                        .classList
                        .contains(
                            "is-open"
                        )
                ) {
                    closeTaskPanel();
                }
            }
        );


    element(
        "logout"
    )
        .addEventListener(
            "click",
            () => {
                sessionStorage
                    .removeItem(
                        "luxsomeAdminToken"
                    );


                window.location
                    .replace(
                        "/admin/login/"
                    );
            }
        );


    /* ==================================================
       MOBILE SIDEBAR
    ================================================== */

    if (
        element(
            "mobileMenuButton"
        )
    ) {
        element(
            "mobileMenuButton"
        )
            .addEventListener(
                "click",
                () => {
                    const sidebar =
                        element(
                            "crmSidebar"
                        );


                    const isOpen =
                        sidebar
                            .classList
                            .toggle(
                                "is-open"
                            );


                    element(
                        "mobileMenuButton"
                    )
                        .setAttribute(
                            "aria-expanded",
                            String(
                                isOpen
                            )
                        );
                }
            );
    }


    /* ==================================================
       INITIAL LOAD
    ================================================== */

    installScheduleConflictStyles();
    ensureScheduleConflictNotice();
    ensureCascadePanel();
    loadProductionSchedule();

})();