(() => {
    "use strict";

    const API_BASE = "https://api.luxsomepackaging.com";
    const token = sessionStorage.getItem("luxsomeAdminToken");

    if (!token) {
        window.location.replace("/admin/login/");
        return;
    }

    const state = {
        orders: [],
        selected: null
    };

    const element = (id) => document.getElementById(id);

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

    function label(value) {
        return String(value || "—")
            .replaceAll("_", " ")
            .replace(/\b\w/g, (character) => character.toUpperCase());
    }

    function formatMoney(value, currency = "NGN") {
        return new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency,
            maximumFractionDigits: 0
        }).format(Number(value) || 0);
    }

    function formatDate(value) {
        if (!value) {
            return "—";
        }

        return new Intl.DateTimeFormat("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric"
        }).format(new Date(`${value}T00:00:00`));
    }

    function formatDateTime(value) {
        if (!value) {
            return "—";
        }

        return new Intl.DateTimeFormat("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(new Date(value));
    }

    async function api(path, options = {}) {
        const response = await fetch(`${API_BASE}${path}`, {
            ...options,
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(
                data.message ||
                "The request could not be completed."
            );
        }

        return data;
    }

    function openPanel(id) {
        element("backdrop").hidden = false;
        element(id).classList.add("open");
        element(id).setAttribute("aria-hidden", "false");
    }

    function closePanels() {
        document.querySelectorAll(".panel.open").forEach((panel) => {
            panel.classList.remove("open");
            panel.setAttribute("aria-hidden", "true");
        });

        element("backdrop").hidden = true;
    }

    async function loadOrders() {
        try {
            element("statusMessage").textContent = "Loading orders…";

            const parameters = new URLSearchParams();
            const search = element("search").value.trim();
            const view = element("viewFilter").value;
            const status = element("statusFilter").value;

            if (search) {
                parameters.set("search", search);
            }

            if (view) {
                parameters.set("view", view);
            }

            if (status) {
                parameters.set("status", status);
            }

            const data = await api(
                `/admin/orders?${parameters.toString()}`
            );

            state.orders = data.orders || [];
            renderOrders();
            element("statusMessage").textContent = "";

            const requested =
                new URLSearchParams(window.location.search)
                    .get("order");

            if (requested) {
                history.replaceState({}, "", "/admin/orders/");
                await viewOrder(requested);
            }
        } catch (error) {
            element("statusMessage").textContent = error.message;
        }
    }

    function renderOrders() {
        const rows = element("orderRows");
        const today = new Date();
        const sevenDays = new Date(
            today.getTime() + 7 * 86400000
        );

        let active = 0;
        let dueSoon = 0;
        let overdue = 0;
        let completed = 0;

        rows.innerHTML = "";

        state.orders.forEach((order) => {
            const finished = ["completed", "cancelled"].includes(
                order.status
            );

            if (!finished) {
                active += 1;
            }

            if (order.status === "completed") {
                completed += 1;
            }

            if (order.production_deadline && !finished) {
                const deadline = new Date(
                    `${order.production_deadline}T23:59:59`
                );

                if (deadline < today) {
                    overdue += 1;
                } else if (deadline <= sevenDays) {
                    dueSoon += 1;
                }
            }

            const row = document.createElement("tr");

            row.innerHTML = `
                <td>
                    <strong>
                        ${escapeHtml(order.order_reference)}
                    </strong>
                    <small>
                        <br>
                        ${escapeHtml(order.invoice_reference)}
                    </small>
                </td>

                <td>
                    ${escapeHtml(
                        order.brand_name ||
                        order.customer_name ||
                        "—"
                    )}
                </td>

                <td>
                    <span class="badge">
                        ${escapeHtml(label(order.status))}
                    </span>
                </td>

                <td>
                    ${escapeHtml(label(order.production_status))}
                </td>

                <td class="priority-${escapeHtml(order.priority)}">
                    ${escapeHtml(label(order.priority))}
                </td>

                <td>
                    ${formatDate(order.production_deadline)}
                </td>

                <td>
                    ${escapeHtml(label(order.payment_status))}
                    <br>
                    <small>
                        ${formatMoney(
                            order.balance_due,
                            order.currency || "NGN"
                        )}
                        due
                    </small>
                </td>

                <td>
                    <button
                        type="button"
                        data-order="${escapeHtml(
                            order.order_reference
                        )}"
                    >
                        View
                    </button>
                </td>
            `;

            rows.appendChild(row);
        });

        element("activeCount").textContent = active;
        element("dueSoonCount").textContent = dueSoon;
        element("overdueCount").textContent = overdue;
        element("completedCount").textContent = completed;
        element("emptyState").hidden = state.orders.length > 0;
    }

    async function viewOrder(reference) {
        try {
            const data = await api(
                `/admin/orders/${encodeURIComponent(reference)}`
            );

            state.selected = data.order;
            fillOrderPanel();
            openPanel("orderPanel");
        } catch (error) {
            window.alert(error.message);
        }
    }

    function fillOrderPanel() {
        const order = state.selected;

        element("orderReference").textContent =
            order.order_reference;

        element("summary").innerHTML = `
            <div>
                <span>Customer</span>
                <strong>
                    ${escapeHtml(
                        order.brand_name ||
                        order.customer_name ||
                        "—"
                    )}
                </strong>
            </div>

            <div>
                <span>Invoice</span>
                <strong>
                    ${escapeHtml(order.invoice_reference)}
                </strong>
            </div>

            <div>
                <span>Invoice total</span>
                <strong>
                    ${formatMoney(
                        order.grand_total,
                        order.currency
                    )}
                </strong>
            </div>

            <div>
                <span>Outstanding balance</span>
                <strong>
                    ${formatMoney(
                        order.balance_due,
                        order.currency
                    )}
                </strong>
            </div>
        `;

        element("orderStatus").value = order.status;
        element("priority").value = order.priority;
        element("designStatus").value = order.design_status;
        element("productionStatus").value =
            order.production_status;
        element("assignedTo").value =
            order.assigned_to || "";
        element("productionDeadline").value =
            order.production_deadline || "";
        element("expectedDeliveryDate").value =
            order.expected_delivery_date || "";
        element("deliveryMethod").value =
            order.delivery_method || "";
        element("deliveryAddress").value =
            order.delivery_address || "";
        element("customerInstructions").value =
            order.customer_instructions || "";
        element("internalNotes").value =
            order.internal_notes || "";
        element("formMessage").textContent = "";

        element("orderItems").innerHTML =
            (order.items || []).map((item) => `
                <article
                    class="item-card"
                    data-item-id="${item.id}"
                >
                    <header>
                        <div>
                            <strong>
                                ${escapeHtml(item.description)}
                            </strong>
                            ${
                                item.details
                                    ? `
                                        <small>
                                            <br>
                                            ${escapeHtml(item.details)}
                                        </small>
                                    `
                                    : ""
                            }
                        </div>

                        <span>
                            ${escapeHtml(item.quantity)}
                            units
                        </span>
                    </header>

                    <label>
                        Production note for this item
                        <textarea
                            data-production-note
                        >${escapeHtml(
                            item.production_notes || ""
                        )}</textarea>
                    </label>
                </article>
            `).join("");
    }

    async function saveOrder(event) {
        event.preventDefault();

        if (!state.selected) {
            return;
        }

        const items = [
            ...document.querySelectorAll(".item-card")
        ].map((card) => ({
            id: Number(card.dataset.itemId),
            productionNotes:
                card.querySelector("[data-production-note]")
                    .value
        }));

        try {
            element("formMessage").textContent = "Saving…";

            await api(
                `/admin/orders/${encodeURIComponent(
                    state.selected.order_reference
                )}`,
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        status: element("orderStatus").value,
                        priority: element("priority").value,
                        designStatus:
                            element("designStatus").value,
                        productionStatus:
                            element("productionStatus").value,
                        assignedTo:
                            element("assignedTo").value.trim(),
                        productionDeadline:
                            element("productionDeadline").value,
                        expectedDeliveryDate:
                            element("expectedDeliveryDate").value,
                        deliveryMethod:
                            element("deliveryMethod").value.trim(),
                        deliveryAddress:
                            element("deliveryAddress").value.trim(),
                        customerInstructions:
                            element("customerInstructions")
                                .value.trim(),
                        internalNotes:
                            element("internalNotes").value.trim(),
                        items
                    })
                }
            );

            element("formMessage").textContent =
                "Order saved.";

            await loadOrders();
            await viewOrder(
                state.selected.order_reference
            );
        } catch (error) {
            element("formMessage").textContent =
                error.message;
        }
    }

    async function showActivity() {
        if (!state.selected) {
            return;
        }

        try {
            const data = await api(
                `/admin/orders/${encodeURIComponent(
                    state.selected.order_reference
                )}/activity`
            );

            element("activityBody").innerHTML =
                (data.activity || []).length
                    ? data.activity.map((activity) => `
                        <article class="activity-row">
                            <strong>
                                ${escapeHtml(activity.title)}
                            </strong>

                            <span>
                                ${formatDateTime(
                                    activity.created_at
                                )}
                            </span>

                            ${
                                activity.details
                                    ? `
                                        <p>
                                            ${escapeHtml(
                                                activity.details
                                            )}
                                        </p>
                                    `
                                    : ""
                            }
                        </article>
                    `).join("")
                    : "<p>No activity yet.</p>";

            openPanel("activityPanel");
        } catch (error) {
            window.alert(error.message);
        }
    }

    document
        .querySelectorAll("[data-close]")
        .forEach((button) => {
            button.addEventListener("click", closePanels);
        });

    element("backdrop").addEventListener(
        "click",
        closePanels
    );

    element("logout").addEventListener("click", () => {
        sessionStorage.removeItem("luxsomeAdminToken");
        window.location.replace("/admin/login/");
    });

    element("orderRows").addEventListener("click", (event) => {
        const button = event.target.closest("[data-order]");

        if (button) {
            viewOrder(button.dataset.order);
        }
    });

    element("orderForm").addEventListener(
        "submit",
        saveOrder
    );

    element("activityButton").addEventListener(
        "click",
        showActivity
    );

    let searchTimer;

    element("search").addEventListener("input", () => {
        window.clearTimeout(searchTimer);
        searchTimer = window.setTimeout(loadOrders, 300);
    });

    element("viewFilter").addEventListener(
        "change",
        loadOrders
    );

    element("statusFilter").addEventListener(
        "change",
        loadOrders
    );

    loadOrders();
})();
