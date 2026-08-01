(() => {
    "use strict";

    const API_BASE = "https://api.luxsomepackaging.com";

    const stages = [
        ["payment_confirmed", "Payment confirmed"],
        ["artwork_specification", "Artwork and specification"],
        ["production", "Production"],
        ["quality_check", "Quality check"],
        ["ready_for_delivery", "Ready for delivery"],
        ["delivered", "Delivered"]
    ];

    const element = id => document.getElementById(id);

    const escapeHtml = value => String(value ?? "").replace(
        /[&<>"']/g,
        character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]
    );

    const formatDate = value => {
        if (!value) return "To be confirmed";

        return new Intl.DateTimeFormat("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric"
        }).format(new Date(`${value}T00:00:00`));
    };

    const formatDateTime = value => {
        if (!value) return "—";

        return new Intl.DateTimeFormat("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(new Date(value));
    };

    function showPortalState(state) {
        element("portalLoading").hidden = state !== "loading";
        element("portalError").hidden = state !== "error";
        element("portalOrder").hidden = state !== "order";
    }

    async function loadOrder() {
        showPortalState("loading");

        const token = new URLSearchParams(
            window.location.search
        ).get("token");

        if (!token) {
            showError("The tracking link is incomplete.");
            return;
        }

        try {
            const response = await fetch(
                `${API_BASE}/public/order-tracking/${encodeURIComponent(token)}`
            );

            const data = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "The tracking link could not be opened."
                );
            }

            renderOrder(data.order);
        } catch (error) {
            showError(error.message);
        }
    }

    function renderOrder(order) {
        showPortalState("order");

        element("brandName").textContent =
            order.brandName ||
            order.clientName ||
            "Your order";

        element("orderReference").textContent =
            order.orderReference;

        const currentIndex = Math.max(
            stages.findIndex(([key]) => key === order.stage),
            0
        );

        element("currentStage").textContent =
            stages[currentIndex][1];

        element("progressNote").textContent =
            order.progressNote ||
            "Your order is progressing through this stage.";

        element("expectedDelivery").textContent =
            formatDate(order.expectedDeliveryDate);

        element("deliveryMethod").textContent =
            order.deliveryMethod || "To be confirmed";

        element("lastUpdated").textContent =
            formatDateTime(order.lastUpdated);

        element("progressTracker").innerHTML =
            stages.map(([key, name], index) => `
                <li class="${
                    index < currentIndex
                        ? "is-complete"
                        : index === currentIndex
                            ? "is-current"
                            : ""
                }">
                    ${escapeHtml(name)}
                </li>
            `).join("");

        element("orderItems").innerHTML =
            (order.items || []).length
                ? order.items.map(item => `
                    <article class="portal-item">
                        <div>
                            <strong>
                                ${escapeHtml(item.description)}
                            </strong>
                            ${
                                item.details
                                    ? `<p>${escapeHtml(item.details)}</p>`
                                    : ""
                            }
                        </div>

                        <span>
                            ${escapeHtml(item.quantity)} units
                        </span>
                    </article>
                `).join("")
                : "<p>No item summary is available.</p>";
    }

    function showError(message) {
        showPortalState("error");
        element("portalErrorMessage").textContent = message;
    }

    loadOrder();
})();
