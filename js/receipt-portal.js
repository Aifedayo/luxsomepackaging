document.addEventListener("DOMContentLoaded", () => {
    const API_BASE = "https://api.luxsomepackaging.com";

    const element = (id) => document.getElementById(id);

    const token =
        new URLSearchParams(window.location.search)
            .get("token") || "";

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
            month: "long",
            year: "numeric"
        }).format(new Date(`${value}T00:00:00`));
    }

    function showError(message) {
        element("loading").hidden = true;
        element("error").hidden = false;
        element("error").textContent = message;
    }

    function renderReceipt(receipt) {
        const currency = receipt.currency || "NGN";

        element("receiptReference").textContent =
            receipt.receipt_reference;

        element("customerName").textContent =
            receipt.brand_name ||
            receipt.customer_name ||
            "Valued customer";

        element("amountReceived").textContent =
            formatMoney(receipt.amount, currency);

        element("invoiceReference").textContent =
            receipt.invoice_reference;

        element("paymentDate").textContent =
            formatDate(receipt.payment_date);

        element("paymentMethod").textContent =
            receipt.payment_method || "—";

        element("paymentReference").textContent =
            receipt.payment_reference || "Not supplied";

        element("invoiceTotal").textContent =
            formatMoney(receipt.grand_total, currency);

        element("totalPaid").textContent =
            formatMoney(receipt.amount_paid, currency);

        element("balanceDue").textContent =
            formatMoney(receipt.balance_due, currency);

        element("invoiceStatus").textContent =
            String(receipt.status || "")
                .replaceAll("_", " ");

        if (receipt.notes) {
            element("notesSection").hidden = false;
            element("paymentNotes").textContent =
                receipt.notes;
        }

        element("loading").hidden = true;
        element("receipt").hidden = false;
    }

    async function loadReceipt() {
        if (!/^[a-f0-9]{64}$/.test(token)) {
            showError("This receipt link is invalid.");
            return;
        }

        try {
            const response = await fetch(
                `${API_BASE}/public/receipts/${token}`,
                {
                    headers: {
                        Accept: "application/json"
                    }
                }
            );

            const data = await response
                .json()
                .catch(() => ({}));

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "The receipt could not be opened."
                );
            }

            renderReceipt(data.receipt);
        } catch (error) {
            showError(error.message);
        }
    }

    element("printReceipt").addEventListener(
        "click",
        () => window.print()
    );

    loadReceipt();
});
