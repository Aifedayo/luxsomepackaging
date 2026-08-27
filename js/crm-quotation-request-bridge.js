/*
 * Luxsome quotation-request bridge
 * Merge these helpers into the existing CRM dashboard JS.
 *
 * Goal:
 * - website quotation requests arrive as normal `submissions`
 * - clicking Create quotation opens the EXISTING quotation builder
 * - customer details and requested packaging are inherited automatically
 * - quantity ranges are preserved as request context, while quotation quantity
 *   remains editable because a range such as 51–100 is not a final quantity.
 */

function isWebsiteQuotationSubmission(submission) {
    return submission?.submission_type === "quotation_request" ||
        submission?.submission_type === "quotation" ||
        submission?.payload?.enquiry_type === "quotation" ||
        submission?.payload?.request_type === "quotation";
}

function extractWebsiteQuotationItems(payload) {
    const source = normaliseSubmissionPayload(payload);
    const rawItems =
        source.quotation_items ||
        source.selected_items ||
        source.items ||
        source.packaging_items ||
        source.selected_products ||
        [];

    let items = rawItems;

    if (typeof items === "string") {
        try {
            items = JSON.parse(items);
        } catch (_) {
            items = items.split(",").map(value => value.trim()).filter(Boolean);
        }
    }

    if (!Array.isArray(items)) items = [];

    const overallQuantity =
        source.selected_quantity ||
        source.quantity_range ||
        source.approximate_quantity ||
        source.quantity ||
        "";

    return items.map((item, index) => {
        if (typeof item === "string") {
            return {
                description: item,
                details: overallQuantity
                    ? `Requested quantity: ${overallQuantity}`
                    : "Imported from website quotation request",
                quantity: numericQuotationQuantity(overallQuantity) || 1,
                requestedQuantity: overallQuantity || "",
                sourcePath: `website.items.${index}`
            };
        }

        const description =
            item.label ||
            item.name ||
            item.product ||
            item.type ||
            item.description ||
            "Packaging item";

        const variant =
            item.option ||
            item.variant ||
            item.style ||
            item.subtype ||
            item.finish ||
            "";

        const requested =
            item.quantity ||
            item.quantity_range ||
            overallQuantity ||
            "";

        const detailParts = [];
        if (variant) detailParts.push(`Option: ${variant}`);
        if (requested) detailParts.push(`Requested quantity: ${requested}`);
        if (item.size) detailParts.push(`Size: ${item.size}`);
        if (item.notes) detailParts.push(String(item.notes));

        return {
            description,
            details: detailParts.join(" • ") || "Imported from website quotation request",
            quantity: numericQuotationQuantity(requested) || 1,
            requestedQuantity: requested || "",
            sourcePath: `website.items.${index}`
        };
    });
}

function numericQuotationQuantity(value) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) {
        return value;
    }

    const textValue = String(value ?? "").replace(/,/g, "").trim();

    // Do not silently turn "51–100" into 51. The CRM should show the range
    // in details and let Luxsome choose the actual quotation quantity.
    if (/^\d+\s*[-–—]\s*\d+$/.test(textValue) || /\+$/.test(textValue)) {
        return 1;
    }

    const match = textValue.match(/^\d+(?:\.\d+)?$/);
    return match ? Number(match[0]) : null;
}

/*
 * INSERT THIS AT THE TOP OF your existing populateQuotationItemsFromSubmission:
 *
 * if (isWebsiteQuotationSubmission(submission)) {
 *     const websiteItems = extractWebsiteQuotationItems(
 *         normaliseSubmissionPayload(submission?.payload)
 *     );
 *
 *     if (websiteItems.length) {
 *         elements.quotationItems.replaceChildren();
 *         websiteItems.forEach(item => addQuotationItem({
 *             description: item.description,
 *             details: item.details,
 *             quantity: item.quantity,
 *             unitPrice: 0,
 *             requestedQuantity: item.requestedQuantity,
 *             inheritedFromProject: true,
 *             sourcePath: item.sourcePath
 *         }));
 *         elements.quotationFormStatus.textContent =
 *             `${websiteItems.length} item${websiteItems.length === 1 ? "" : "s"} imported from the website quotation request. Confirm quantities and enter unit prices.`;
 *         updateQuotationTotals();
 *         return;
 *     }
 * }
 */
