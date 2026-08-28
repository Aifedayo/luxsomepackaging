(() => {
    "use strict";

    const API_BASE = window.LUXSOME.apiBase;
    const token = sessionStorage.getItem("luxsomeAdminToken");

    if (!token) {
        window.location.replace("/admin/login/");
        return;
    }

    const state = {
        orders: [],
        selected: null,
        dispatchEligibility: null
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

    function mapOrderStatusToClientStage(status) {
        const map = {
            new: "payment_confirmed",
            design_pending: "artwork_specification",
            awaiting_approval: "artwork_specification",
            materials_sourcing: "production",
            in_production: "production",
            quality_check: "quality_check",
            ready_for_delivery: "ready_for_delivery",
            completed: "delivered"
        };

        return map[status] || "payment_confirmed";
    }

    function buildPortalLink(tokenValue) {
        const url = new URL(
            "/track-order/",
            window.location.origin
        );

        url.searchParams.set("token", tokenValue);
        return url.toString();
    }

    async function emailPortalLink() {
        if (!state.selected) return;

        const button = element("emailClientPortalLink");
        const originalText = button.textContent;

        try {
            button.disabled = true;
            button.textContent = "Sending…";
            element("formMessage").textContent =
                "Sending the tracking link…";

            const data = await api(
                `/admin/orders/${encodeURIComponent(
                    state.selected.order_reference
                )}/send-tracking`,
                {
                    method: "POST",
                    body: JSON.stringify({})
                }
            );

            element("formMessage").textContent =
                data.message ||
                "Tracking link emailed to the client.";
        } catch (error) {
            element("formMessage").textContent = error.message;
        } finally {
            button.disabled = false;
            button.textContent = originalText;
        }
    }

    async function copyPortalLink() {
        const link = element("clientPortalLink").value;

        if (!link) return;

        try {
            await navigator.clipboard.writeText(link);
            element("formMessage").textContent =
                "Client tracking link copied.";
        } catch (_) {
            element("clientPortalLink").select();
            document.execCommand("copy");
            element("formMessage").textContent =
                "Client tracking link copied.";
        }
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
            state.dispatchEligibility = null;

            try {
                const dispatchData = await api(
                    `/admin/orders/${encodeURIComponent(
                        reference
                    )}/dispatch-eligibility`
                );

                state.dispatchEligibility =
                    dispatchData.dispatch || null;
            } catch (error) {
                console.warn(
                    "[Luxsome CRM] Dispatch eligibility unavailable",
                    error
                );
            }

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

        const portalEnabled = Boolean(
            Number(order.portal_enabled || 0)
        );

        element("portalEnabled").checked = portalEnabled;
        element("clientProgressStage").value =
            order.client_progress_stage ||
            mapOrderStatusToClientStage(order.status);
        element("clientProgressNote").value =
            order.client_progress_note || "";
        element("portalExpiry").value =
            order.portal_expires_at
                ? formatDateTime(order.portal_expires_at)
                : "Available until 20 days after completion";

        const portalLink = order.portal_token
            ? buildPortalLink(order.portal_token)
            : "";

        element("clientPortalLink").value = portalLink;
        element("clientPortalLinkArea").hidden = !portalLink;
        element("formMessage").textContent = "";

        setupOrderDispatchSection(order);

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


    function setupOrderDispatchSection(order) {
        const section = element("orderDispatchSection");
        const eligibility = state.dispatchEligibility;

        if (!section) return;

        section.hidden = !eligibility?.eligible;

        if (!eligibility?.eligible) {
            return;
        }

        element("orderDispatchReceiptBadge").textContent =
            eligibility.receipt_reference
                ? `Receipt ${eligibility.receipt_reference}`
                : "Receipt verified";

        element("orderDispatchRecipient").value =
            order.customer_name || "";

        element("orderDispatchBrand").value =
            order.brand_name || "";

        element("orderDispatchPhone").value =
            order.customer_phone || "";

        element("orderDispatchAddress").value =
            order.delivery_address || "";

        element("orderDispatchCity").value = "";
        element("orderDispatchState").value = "";
        element("orderDispatchWeight").value = "";
        element("orderDispatchPackageCount").value = "1";
        element("orderDispatchTrackingId").value =
            order.order_reference || "";
        element("orderDispatchDescription").value =
            "Luxury packaging systems";
        element("orderDispatchFragile").checked = true;

        element("orderDispatchMessage").textContent =
            "Receipt verified. Confirm the dispatch details before printing.";
    }

    function collectOrderDispatchData() {
        const order = state.selected;
        const eligibility = state.dispatchEligibility;

        if (!order) {
            throw new Error("Open an order first.");
        }

        if (!eligibility?.eligible) {
            throw new Error(
                "A verified payment receipt is required before printing a dispatch label."
            );
        }

        const value = id =>
            String(element(id)?.value || "").trim();

        const packageCount = Number(
            value("orderDispatchPackageCount")
        );

        if (!value("orderDispatchRecipient")) {
            throw new Error("Enter the recipient name.");
        }

        if (!value("orderDispatchPhone")) {
            throw new Error("Enter the phone number.");
        }

        if (!value("orderDispatchAddress")) {
            throw new Error("Enter the delivery address.");
        }

        if (
            !Number.isInteger(packageCount) ||
            packageCount < 1 ||
            packageCount > 50
        ) {
            throw new Error(
                "Package count must be between 1 and 50."
            );
        }

        return {
            orderReference: order.order_reference,
            invoiceReference: order.invoice_reference,
            receiptReference:
                eligibility.receipt_reference || "",
            trackingId:
                value("orderDispatchTrackingId") ||
                order.order_reference,
            recipientName:
                value("orderDispatchRecipient"),
            brandName:
                value("orderDispatchBrand"),
            phone:
                value("orderDispatchPhone"),
            address:
                value("orderDispatchAddress"),
            city:
                value("orderDispatchCity"),
            state:
                value("orderDispatchState"),
            weight:
                value("orderDispatchWeight"),
            description:
                value("orderDispatchDescription") ||
                "Luxury packaging systems",
            packageCount,
            fragile:
                Boolean(
                    element("orderDispatchFragile")
                        ?.checked
                ),
            dispatchDate:
                new Date().toLocaleDateString(
                    "en-NG",
                    {
                        year: "numeric",
                        month: "short",
                        day: "2-digit"
                    }
                )
        };
    }

    function orderDispatchLocation(data) {
        return [
            data.address,
            data.city,
            data.state
        ]
            .filter(Boolean)
            .join(", ");
    }

    function orderDispatchLabelMarkup(
        data,
        packageNumber
    ) {
        return `
            <article class="dispatch-label-sheet">
                <header class="dispatch-label-sheet__top">
                    <div class="dispatch-label-sheet__brandmark">
                        <img
                            src="/assets/images/luxsome-logo.png"
                            alt="Luxsome Packaging"
                        >
                    </div>

                    <div class="dispatch-label-sheet__fragile-block">
                        ${
                            data.fragile
                                ? `
                                    <strong>FRAGILE</strong>
                                    <span>PLEASE HANDLE WITH CARE</span>
                                `
                                : `
                                    <strong>DISPATCH</strong>
                                    <span>LUXSOME PACKAGING</span>
                                `
                        }
                    </div>
                </header>

                <section class="dispatch-label-sheet__service">
                    <strong>PRIORITY DISPATCH</strong>

                    <div>
                        <span>Date</span>
                        <b>${escapeHtml(data.dispatchDate)}</b>
                    </div>
                </section>

                <section class="dispatch-label-sheet__route">
                    <div class="dispatch-label-sheet__from">
                        <span class="dispatch-label-sheet__section-title">
                            FROM
                        </span>

                        <strong>Luxsome Packaging</strong>
                        <p>Lagos, Nigeria</p>
                        <small>
                            Order ${escapeHtml(data.orderReference)}
                        </small>
                    </div>

                    <div class="dispatch-label-sheet__to">
                        <span class="dispatch-label-sheet__section-title">
                            TO
                        </span>

                        <h3>
                            ${escapeHtml(data.recipientName)}
                        </h3>

                        ${
                            data.brandName
                                ? `
                                    <strong class="dispatch-label-sheet__recipient-brand">
                                        ${escapeHtml(data.brandName)}
                                    </strong>
                                `
                                : ""
                        }

                        <address>
                            ${escapeHtml(orderDispatchLocation(data))}
                        </address>

                        <p class="dispatch-label-sheet__phone">
                            ${escapeHtml(data.phone)}
                        </p>
                    </div>
                </section>

                <section class="dispatch-label-sheet__information">
                    <div>
                        <span>Package</span>
                        <strong>
                            ${packageNumber} of ${data.packageCount}
                        </strong>
                    </div>

                    <div>
                        <span>Contents</span>
                        <strong>
                            ${escapeHtml(data.description)}
                        </strong>
                    </div>

                    ${
                        data.weight
                            ? `
                                <div>
                                    <span>Weight</span>
                                    <strong>
                                        ${escapeHtml(data.weight)}
                                    </strong>
                                </div>
                            `
                            : ""
                    }

                    <div>
                        <span>Receipt</span>
                        <strong>
                            ${escapeHtml(data.receiptReference)}
                        </strong>
                    </div>
                </section>

                <section class="dispatch-label-sheet__tracking">
                    <div>
                        <span>TRACKING ID</span>
                        <strong>
                            ${escapeHtml(data.trackingId)}
                        </strong>
                    </div>

                    <div class="dispatch-label-sheet__tracking-meta">
                        <span>INVOICE</span>
                        <b>${escapeHtml(data.invoiceReference)}</b>
                    </div>
                </section>
            </article>
        `;
    }

    function buildOrderDispatchLabels(data) {
        return Array.from(
            { length: data.packageCount },
            (_, index) =>
                orderDispatchLabelMarkup(
                    data,
                    index + 1
                )
        ).join("");
    }

    function previewOrderDispatch() {
        try {
            const data = collectOrderDispatchData();

            element("dispatchPreviewBody").innerHTML =
                buildOrderDispatchLabels(data);

            openPanel("dispatchPreviewPanel");

            element("orderDispatchMessage").textContent =
                `${data.packageCount} dispatch label${data.packageCount === 1 ? "" : "s"} ready.`;
        } catch (error) {
            element("orderDispatchMessage").textContent =
                error.message;
        }
    }

    function printOrderDispatch() {
        try {
            const data = collectOrderDispatchData();

            const printWindow = window.open("", "_blank");

            if (!printWindow) {
                throw new Error(
                    "Allow pop-ups for the CRM and try again."
                );
            }

            printWindow.document.open();
            printWindow.document.write(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Dispatch Label · ${escapeHtml(data.orderReference)}</title>
<style>
@page { size: 4in 6in; margin: 0; }
* { box-sizing: border-box; }
html,body { margin:0;padding:0;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif; }

.dispatch-label-sheet {
    width:4in;
    height:6in;
    display:flex;
    flex-direction:column;
    overflow:hidden;
    border:2px solid #111;
    background:#fff;
    page-break-after:always;
    break-after:page;
}
.dispatch-label-sheet:last-child { page-break-after:auto; break-after:auto; }

.dispatch-label-sheet__top {
    display:grid;
    grid-template-columns:1.05fr 1fr;
    min-height:.78in;
    border-bottom:2px solid #111;
}
.dispatch-label-sheet__brandmark {
    display:flex;
    align-items:center;
    padding:.12in .16in;
    border-right:2px solid #111;
}
.dispatch-label-sheet__brandmark img {
    width:1.42in;
    max-height:.42in;
    object-fit:contain;
    object-position:left center;
}
.dispatch-label-sheet__fragile-block {
    display:flex;
    flex-direction:column;
    justify-content:center;
    padding:.08in .13in;
}
.dispatch-label-sheet__fragile-block strong {
    font-size:27pt;
    font-weight:900;
    line-height:.9;
    letter-spacing:-.035em;
}
.dispatch-label-sheet__fragile-block span {
    margin-top:4px;
    font-size:7.5pt;
    font-weight:700;
    letter-spacing:.13em;
}

.dispatch-label-sheet__service {
    display:grid;
    grid-template-columns:1fr auto;
    min-height:.48in;
    border-bottom:2px solid #111;
}
.dispatch-label-sheet__service > strong {
    display:flex;
    align-items:center;
    padding:.08in .13in;
    font-size:18pt;
    font-weight:900;
}
.dispatch-label-sheet__service > div {
    min-width:1.15in;
    display:flex;
    flex-direction:column;
    justify-content:center;
    padding:.05in .11in;
    border-left:2px solid #111;
}
.dispatch-label-sheet__service span,
.dispatch-label-sheet__section-title,
.dispatch-label-sheet__information span,
.dispatch-label-sheet__tracking span {
    display:block;
    font-size:7pt;
    font-weight:800;
    letter-spacing:.08em;
    text-transform:uppercase;
}
.dispatch-label-sheet__service b { margin-top:2px; font-size:8.5pt; }

.dispatch-label-sheet__route {
    display:grid;
    grid-template-columns:.9fr 1.25fr;
    min-height:2.35in;
    border-bottom:2px solid #111;
}
.dispatch-label-sheet__from,
.dispatch-label-sheet__to { padding:.14in .13in; }
.dispatch-label-sheet__from { border-right:2px solid #111; }
.dispatch-label-sheet__from > strong {
    display:block;
    margin-top:.08in;
    font-size:11pt;
}
.dispatch-label-sheet__from p,
.dispatch-label-sheet__from small {
    display:block;
    margin:.05in 0 0;
    font-size:8.5pt;
    line-height:1.35;
}
.dispatch-label-sheet__to h3 {
    margin:.08in 0 0;
    font-size:19pt;
    line-height:1;
    font-weight:900;
    text-transform:uppercase;
}
.dispatch-label-sheet__recipient-brand {
    display:block;
    margin-top:.06in;
    font-size:9.5pt;
}
.dispatch-label-sheet__to address {
    margin-top:.1in;
    font-size:11.5pt;
    font-style:normal;
    font-weight:700;
    line-height:1.28;
}
.dispatch-label-sheet__phone {
    margin:.1in 0 0;
    font-size:13pt;
    font-weight:900;
}

.dispatch-label-sheet__information {
    display:grid;
    grid-template-columns:repeat(2,minmax(0,1fr));
    min-height:.84in;
    border-bottom:2px solid #111;
}
.dispatch-label-sheet__information > div {
    padding:.09in .11in;
    border-right:1px solid #111;
    border-bottom:1px solid #111;
}
.dispatch-label-sheet__information > div:nth-child(2n) { border-right:0; }
.dispatch-label-sheet__information strong {
    display:block;
    margin-top:3px;
    font-size:8.5pt;
    line-height:1.2;
}

.dispatch-label-sheet__tracking {
    margin-top:auto;
    display:grid;
    grid-template-columns:1fr 1.02in;
    min-height:.76in;
}
.dispatch-label-sheet__tracking > div:first-child {
    display:flex;
    flex-direction:column;
    justify-content:center;
    padding:.1in .14in;
}
.dispatch-label-sheet__tracking strong {
    display:block;
    margin-top:4px;
    font-size:16pt;
    font-weight:900;
    letter-spacing:.025em;
    overflow-wrap:anywhere;
}
.dispatch-label-sheet__tracking-meta {
    display:flex;
    flex-direction:column;
    justify-content:center;
    padding:.08in .1in;
    border-left:2px solid #111;
}
.dispatch-label-sheet__tracking-meta b {
    display:block;
    margin-top:4px;
    font-size:7.5pt;
    overflow-wrap:anywhere;
}
</style>
</head>
<body>
${buildOrderDispatchLabels(data)}
<script>
window.addEventListener("load", function () {
    window.setTimeout(function () {
        window.print();
    }, 250);
});
<\/script>
</body>
</html>
            `);
            printWindow.document.close();

            element("orderDispatchMessage").textContent =
                "Print dialog opened.";
        } catch (error) {
            element("orderDispatchMessage").textContent =
                error.message;
        }
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
                        portalEnabled:
                            element("portalEnabled").checked,
                        clientProgressStage:
                            element("clientProgressStage").value,
                        clientProgressNote:
                            element("clientProgressNote")
                                .value.trim(),
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

    element("previewOrderDispatchLabel").addEventListener(
        "click",
        previewOrderDispatch
    );

    element("printOrderDispatchLabel").addEventListener(
        "click",
        printOrderDispatch
    );

    element("dispatchPreviewPrint").addEventListener(
        "click",
        printOrderDispatch
    );

    element("copyClientPortalLink").addEventListener(
        "click",
        copyPortalLink
    );

    element("emailClientPortalLink").addEventListener(
        "click",
        emailPortalLink
    );

    element("orderStatus").addEventListener(
        "change",
        () => {
            element("clientProgressStage").value =
                mapOrderStatusToClientStage(
                    element("orderStatus").value
                );
        }
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
