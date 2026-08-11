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
        editingTaskId: null
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
                        endY
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
                    (task) => `
                        <article
                            class="gantt-task-row"
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
                        </article>
                    `
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
       CLICK TASK
    ================================================== */

    function openTaskFromTarget(
        target
    ) {
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
            endY
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
            "gantt-dependency-line"
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
            }
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

    loadProductionSchedule();

})();