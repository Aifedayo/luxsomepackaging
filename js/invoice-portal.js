document.addEventListener("DOMContentLoaded", () => {
    const API_BASE = window.LUXSOME.apiBase;
    const MAX_SLIP_SIZE = 5 * 1024 * 1024;
    const ALLOWED_SLIP_TYPES = new Set([
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf"
    ]);
    const $ = id => document.getElementById(id);
    const token = new URLSearchParams(location.search).get("token") || "";
    let invoice = null;
    let previewUrl = "";

    const esc = value => String(value ?? "").replace(
        /[&<>"']/g,
        character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        })[character]
    );

    const money = (value, currency = "NGN") => {
        try {
            return new Intl.NumberFormat("en-NG", {
                style: "currency",
                currency: currency || "NGN",
                maximumFractionDigits: 0
            }).format(Number(value) || 0);
        } catch {
            return `₦${Number(value || 0).toLocaleString("en-NG")}`;
        }
    };

    const date = value => value
        ? new Intl.DateTimeFormat("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric"
        }).format(new Date(`${value}T00:00:00`))
        : "—";

    async function api(path, options = {}) {
        const response = await fetch(API + path, options);
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(data.message || "Request failed");
        }

        return data;
    }

    function render() {
        const current = invoice;
        const currency = current.currency || "NGN";

        $("invoiceReference").textContent = current.invoice_reference;
        $("customerName").textContent =
            current.brand_name || current.customer_name || "Valued customer";
        $("invoiceStatus").textContent =
            String(current.status || "").replaceAll("_", " ");
        $("balanceDue").textContent = money(current.balance_due, currency);
        $("grandTotal").textContent = money(current.grand_total, currency);
        $("issueDate").textContent = date(current.issue_date);
        $("dueDate").textContent = date(current.due_date);

        $("invoiceItems").innerHTML = current.items.map(item => `
            <tr>
                <td>
                    <strong>${esc(item.description)}</strong>
                    ${item.details
                        ? `<span class="item-detail">${esc(item.details)}</span>`
                        : ""}
                </td>
                <td>${esc(item.quantity)}</td>
                <td>${money(item.unit_price, currency)}</td>
                <td>${money(item.line_total, currency)}</td>
            </tr>
        `).join("");

        $("invoiceTotals").innerHTML = `
            <div><span>Subtotal</span><strong>${money(current.subtotal, currency)}</strong></div>
            <div><span>Discount</span><strong>− ${money(current.discount, currency)}</strong></div>
            <div><span>Delivery</span><strong>${money(current.delivery_fee, currency)}</strong></div>
            <div><span>Tax</span><strong>${money(current.tax, currency)}</strong></div>
            <div><span>Amount paid</span><strong>${money(current.amount_paid, currency)}</strong></div>
            <div class="grand"><span>Balance due</span><strong>${money(current.balance_due, currency)}</strong></div>
        `;

        $("paymentInstructions").textContent =
            current.payment_instructions ||
            "Please contact Luxsome Packaging for payment details.";
        $("paymentTerms").textContent =
            current.payment_terms ||
            "Payment is due according to the agreed project terms.";
        $("paymentAmount").value = Math.max(
            0,
            Number(current.balance_due) || 0
        );

        if (current.status === "paid" || Number(current.balance_due) <= 0) {
            $("paymentCard").innerHTML = `
                <div class="paid-note">
                    <strong>Payment complete</strong>
                    <p>This invoice has been marked as paid.</p>
                </div>
            `;
        } else if (current.payment_confirmation_status === "submitted") {
            $("paymentCard").innerHTML = `
                <div class="payment-submitted">
                    <strong>Payment information submitted</strong>
                    <p>Luxsome Packaging is verifying the payment of ${money(
                        current.payment_confirmation_amount,
                        currency
                    )}.</p>
                    ${current.payment_confirmation_file_name
                        ? `<p>Attached slip: ${esc(
                            current.payment_confirmation_file_name
                        )}</p>`
                        : ""}
                </div>
            `;
        }

        $("loading").hidden = true;
        $("invoice").hidden = false;
    }

    async function load() {
        if (!/^[a-f0-9]{64}$/.test(token)) {
            showError("This invoice link is invalid.");
            return;
        }

        try {
            const data = await api(`/public/invoices/${token}`);
            invoice = data.invoice;
            render();
        } catch (error) {
            showError(error.message);
        }
    }

    function showError(message) {
        $("loading").hidden = true;
        $("error").hidden = false;
        $("error").textContent = message;
    }

    function clearSlipPreview() {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            previewUrl = "";
        }

        $("paymentSlip").value = "";
        $("paymentSlipPreview").hidden = true;
        $("paymentSlipImage").hidden = true;
        $("paymentSlipImage").removeAttribute("src");
        $("paymentSlipName").textContent = "";
        $("paymentSlipSize").textContent = "";
    }

    $("paymentSlip").addEventListener("change", event => {
        const file = event.target.files?.[0];

        if (!file) {
            clearSlipPreview();
            return;
        }

        if (!ALLOWED_SLIP_TYPES.has(file.type)) {
            clearSlipPreview();
            $("paymentStatus").textContent =
                "Upload a JPG, PNG, WEBP or PDF payment slip.";
            return;
        }

        if (file.size > MAX_SLIP_SIZE) {
            clearSlipPreview();
            $("paymentStatus").textContent =
                "The payment slip must not exceed 5 MB.";
            return;
        }

        $("paymentStatus").textContent = "";
        $("paymentSlipName").textContent = file.name;
        $("paymentSlipSize").textContent =
            `${(file.size / 1024 / 1024).toFixed(2)} MB`;
        $("paymentSlipPreview").hidden = false;

        if (file.type.startsWith("image/")) {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
            }

            previewUrl = URL.createObjectURL(file);
            $("paymentSlipImage").src = previewUrl;
            $("paymentSlipImage").hidden = false;
        } else {
            $("paymentSlipImage").hidden = true;
        }
    });

    $("removePaymentSlip").addEventListener("click", clearSlipPreview);

    $("paymentForm").addEventListener("submit", async event => {
        event.preventDefault();

        const button = $("paymentButton");
        const slip = $("paymentSlip").files?.[0];

        if (!slip) {
            $("paymentStatus").textContent = "Attach your payment slip.";
            return;
        }

        button.disabled = true;
        $("paymentStatus").textContent = "Uploading payment information…";

        const formData = new FormData();
        formData.append(
            "amount",
            String(Number($("paymentAmount").value) || 0)
        );
        formData.append(
            "reference",
            $("paymentReference").value.trim()
        );
        formData.append("note", $("paymentNote").value.trim());
        formData.append("paymentSlip", slip, slip.name);

        try {
            const data = await api(
                `/public/invoices/${token}/confirm-payment`,
                {
                    method: "POST",
                    body: formData
                }
            );

            $("paymentStatus").textContent = data.message;
            $("paymentForm")
                .querySelectorAll("input,textarea,button")
                .forEach(element => {
                    element.disabled = true;
                });
        } catch (error) {
            $("paymentStatus").textContent = error.message;
            button.disabled = false;
        }
    });

    $("printInvoice").onclick = () => window.print();
    window.addEventListener("beforeunload", () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
    });

    load();
});
