const RESEND_BATCH_ENDPOINT = "https://api.resend.com/emails/batch";
const RESEND_EMAIL_ENDPOINT = "https://api.resend.com/emails";
const PROJECT_PATH = "/project";
const CONTACT_PATH = "/contact";
const HEALTH_PATH = "/health";
const ADMIN_PATH = "/admin";
const ARTWORK_PATH = "/artwork";
const ARTWORK_SESSION_PATH = "/artwork/session";
const ARTWORK_UPLOAD_PREFIX = "/artwork/upload/incoming/";

export default {
    async fetch(request, env) {
        try {
            const url = new URL(request.url);

            if (request.method === "OPTIONS") {
                return handlePreflight(request, env);
            }

            if (request.method === "GET" && url.pathname === HEALTH_PATH) {
                return jsonResponse(
                    {
                        success: true,
                        service: "Luxsome Project API",
                        status: "running"
                    },
                    200,
                    request,
                    env
                );
            }

            if (url.pathname === ARTWORK_SESSION_PATH ||
                url.pathname.startsWith(ARTWORK_UPLOAD_PREFIX)) {
                if (!isAllowedOrigin(request.headers.get("Origin"), env)) {
                    return jsonResponse(
                        {
                            success: false,
                            message: "This website is not allowed to upload artwork."
                        },
                        403,
                        request,
                        env
                    );
                }

                return await handleArtworkRequest(request, env, url);
            }

            if (url.pathname.startsWith("/public/quotations/")) {
                if (!isAllowedOrigin(request.headers.get("Origin"), env)) {
                    return jsonResponse(
                        {
                            success: false,
                            message: "This website is not allowed to access quotations."
                        },
                        403,
                        request,
                        env
                    );
                }

                return await handlePublicQuotationRequest(request, env, url);
            }

            if (url.pathname.startsWith("/public/invoices/")) {
                if (!isAllowedOrigin(request.headers.get("Origin"), env)) {
                    return jsonResponse(
                        {
                            success: false,
                            message: "This website is not allowed to access invoices."
                        },
                        403,
                        request,
                        env
                    );
                }

                return await handlePublicInvoiceRequest(request, env, url);
            }

            if (url.pathname.startsWith("/public/receipts/")) {
                if (!isAllowedOrigin(request.headers.get("Origin"), env)) {
                    return jsonResponse(
                        {
                            success: false,
                            message: "This website is not allowed to access receipts."
                        },
                        403,
                        request,
                        env
                    );
                }

                return await handlePublicReceiptRequest(request, env, url);
            }

            if (url.pathname.startsWith("/public/order-tracking/")) {
                if (!isAllowedOrigin(request.headers.get("Origin"), env)) {
                    return jsonResponse(
                        {
                            success: false,
                            message: "This website is not allowed to access order tracking."
                        },
                        403,
                        request,
                        env
                    );
                }

                return await handlePublicOrderTrackingRequest(
                    request,
                    env,
                    url
                );
            }

            if (url.pathname.startsWith(`${ADMIN_PATH}/`)) {
                if (!isAllowedOrigin(request.headers.get("Origin"), env)) {
                    return jsonResponse(
                        {
                            success: false,
                            message: "This website is not allowed to access the CRM."
                        },
                        403,
                        request,
                        env
                    );
                }

                return await handleAdminRequest(request, env, url);
            }

            if (
                request.method !== "POST" ||
                ![PROJECT_PATH, CONTACT_PATH].includes(url.pathname)
            ) {
                return jsonResponse(
                    {
                        success: false,
                        message: "Endpoint not found."
                    },
                    404,
                    request,
                    env
                );
            }

            if (!isAllowedOrigin(request.headers.get("Origin"), env)) {
                return jsonResponse(
                    {
                        success: false,
                        message: "This website is not allowed to submit forms."
                    },
                    403,
                    request,
                    env
                );
            }

            if (url.pathname === CONTACT_PATH) {
                return await handleContactSubmission(request, env);
            }

            return await handleProjectSubmission(request, env);
        } catch (error) {
            console.error("Unhandled Worker request error", error);

            return jsonResponse(
                {
                    success: false,
                    message: "The API request could not be completed.",
                    error:
                        error instanceof Error
                            ? error.message
                            : "Unknown Worker error"
                },
                500,
                request,
                env
            );
        }
    },

    async scheduled(controller, env, ctx) {
        ctx.waitUntil(expireCompletedClientPortals(env.DB));
    }
};

async function handleAdminRequest(request, env, url) {
    try {
        assertAdminEnvironment(env);

        if (!isAdminAuthorised(request, env)) {
            return jsonResponse(
                {
                    success: false,
                    message: "Invalid or missing administrator token."
                },
                401,
                request,
                env
            );
        }

        if (request.method === "GET" && url.pathname === "/admin/stats") {
            return await handleAdminStats(request, env);
        }

        if (request.method === "GET" && url.pathname === "/admin/submissions") {
            return await handleAdminSubmissionList(request, env, url);
        }

        const artworkFileMatch = url.pathname.match(
            /^\/admin\/submissions\/([A-Z0-9-]+)\/artwork\/file$/
        );

        if (artworkFileMatch && request.method === "GET") {
            return await handleAdminArtworkFile(
                request,
                env,
                url,
                artworkFileMatch[1]
            );
        }

        const artworkListMatch = url.pathname.match(
            /^\/admin\/submissions\/([A-Z0-9-]+)\/artwork$/
        );

        if (artworkListMatch && request.method === "GET") {
            return await handleAdminArtworkList(
                request,
                env,
                artworkListMatch[1]
            );
        }

        const artworkReviewMatch = url.pathname.match(
            /^\/admin\/submissions\/([A-Z0-9-]+)\/artwork-review$/
        );

        if (artworkReviewMatch && request.method === "PATCH") {
            return await handleAdminArtworkReviewUpdate(
                request,
                env,
                artworkReviewMatch[1]
            );
        }

        const detailMatch = url.pathname.match(
            /^\/admin\/submissions\/([A-Z0-9-]+)$/
        );

        if (detailMatch && request.method === "GET") {
            return await handleAdminSubmissionDetail(
                request,
                env,
                detailMatch[1]
            );
        }

        if (detailMatch && request.method === "PATCH") {
            return await handleAdminSubmissionUpdate(
                request,
                env,
                detailMatch[1]
            );
        }

        if (request.method === "GET" && url.pathname === "/admin/orders") {
            return await handleAdminOrderList(request, env, url);
        }

        const orderFromInvoiceMatch = url.pathname.match(
            /^\/admin\/orders\/from-invoice\/([A-Z0-9-]+)$/
        );

        if (orderFromInvoiceMatch && request.method === "POST") {
            return await handleAdminOrderFromInvoice(
                request,
                env,
                orderFromInvoiceMatch[1]
            );
        }

        const orderActivityMatch = url.pathname.match(
            /^\/admin\/orders\/([A-Z0-9-]+)\/activity$/
        );

        if (orderActivityMatch && request.method === "GET") {
            return await handleAdminOrderActivity(
                request,
                env,
                orderActivityMatch[1]
            );
        }

        const orderTrackingEmailMatch = url.pathname.match(
            /^\/admin\/orders\/([A-Z0-9-]+)\/send-tracking$/
        );

        if (
            orderTrackingEmailMatch &&
            request.method === "POST"
        ) {
            return await handleAdminOrderTrackingEmail(
                request,
                env,
                orderTrackingEmailMatch[1]
            );
        }

        const orderMatch = url.pathname.match(
            /^\/admin\/orders\/([A-Z0-9-]+)$/
        );

        if (orderMatch && request.method === "GET") {
            return await handleAdminOrderDetail(
                request,
                env,
                orderMatch[1]
            );
        }

        if (orderMatch && request.method === "PATCH") {
            return await handleAdminOrderUpdate(
                request,
                env,
                orderMatch[1]
            );
        }

        if (request.method === "GET" && url.pathname === "/admin/invoices") {
            return await handleAdminInvoiceList(request, env, url);
        }

        if (request.method === "POST" && url.pathname === "/admin/invoices") {
            return await handleAdminInvoiceCreate(request, env);
        }

        const invoiceFromQuoteMatch = url.pathname.match(
            /^\/admin\/invoices\/from-quotation\/([A-Z0-9-]+)$/
        );

        if (invoiceFromQuoteMatch && request.method === "POST") {
            return await handleAdminInvoiceFromQuotation(
                request, env, invoiceFromQuoteMatch[1]
            );
        }

        const invoiceSendMatch = url.pathname.match(
            /^\/admin\/invoices\/([A-Z0-9-]+)\/send$/
        );

        if (invoiceSendMatch && request.method === "POST") {
            return await handleAdminInvoiceSend(
                request,
                env,
                invoiceSendMatch[1]
            );
        }

        const invoiceActivityMatch = url.pathname.match(
            /^\/admin\/invoices\/([A-Z0-9-]+)\/activity$/
        );

        if (invoiceActivityMatch && request.method === "GET") {
            return await handleAdminInvoiceActivity(
                request,
                env,
                invoiceActivityMatch[1]
            );
        }

        const invoicePaymentsMatch = url.pathname.match(
            /^\/admin\/invoices\/([A-Z0-9-]+)\/payments$/
        );

        if (invoicePaymentsMatch && request.method === "GET") {
            return await handleAdminInvoicePaymentList(
                request,
                env,
                invoicePaymentsMatch[1]
            );
        }

        if (invoicePaymentsMatch && request.method === "POST") {
            return await handleAdminInvoicePaymentCreate(
                request,
                env,
                invoicePaymentsMatch[1]
            );
        }

        const invoicePaymentDeleteMatch = url.pathname.match(
            /^\/admin\/invoices\/([A-Z0-9-]+)\/payments\/(\d+)$/
        );

        if (invoicePaymentDeleteMatch && request.method === "DELETE") {
            return await handleAdminInvoicePaymentDelete(
                request,
                env,
                invoicePaymentDeleteMatch[1],
                Number(invoicePaymentDeleteMatch[2])
            );
        }

        const paymentReceiptSendMatch = url.pathname.match(
            /^\/admin\/payments\/(\d+)\/send-receipt$/
        );

        if (paymentReceiptSendMatch && request.method === "POST") {
            return await handleAdminReceiptSend(
                request,
                env,
                Number(paymentReceiptSendMatch[1])
            );
        }

        const invoicePaymentSlipMatch = url.pathname.match(
            /^\/admin\/invoices\/([A-Z0-9-]+)\/payment-slip$/
        );

        if (invoicePaymentSlipMatch && request.method === "GET") {
            return await handleAdminInvoicePaymentSlip(
                request,
                env,
                invoicePaymentSlipMatch[1]
            );
        }

        const invoiceMatch = url.pathname.match(
            /^\/admin\/invoices\/([A-Z0-9-]+)$/
        );

        if (invoiceMatch && request.method === "GET") {
            return await handleAdminInvoiceDetail(request, env, invoiceMatch[1]);
        }

        if (invoiceMatch && request.method === "PATCH") {
            return await handleAdminInvoiceUpdate(request, env, invoiceMatch[1]);
        }

        if (
            request.method === "GET" &&
            url.pathname === "/admin/quotations"
        ) {
            return await handleAdminQuotationList(request, env, url);
        }

        if (
            request.method === "POST" &&
            url.pathname === "/admin/quotations"
        ) {
            return await handleAdminQuotationCreate(request, env);
        }

        const quotationSendMatch = url.pathname.match(
            /^\/admin\/quotations\/([A-Z0-9-]+)\/send$/
        );

        if (quotationSendMatch && request.method === "POST") {
            return await handleAdminQuotationSend(
                request,
                env,
                quotationSendMatch[1]
            );
        }

        const quotationMatch = url.pathname.match(
            /^\/admin\/quotations\/([A-Z0-9-]+)$/
        );

        if (quotationMatch && request.method === "GET") {
            return await handleAdminQuotationDetail(
                request,
                env,
                quotationMatch[1]
            );
        }

        if (quotationMatch && request.method === "PATCH") {
            return await handleAdminQuotationUpdate(
                request,
                env,
                quotationMatch[1]
            );
        }

        return jsonResponse(
            {
                success: false,
                message: "Admin endpoint not found."
            },
            404,
            request,
            env
        );
    } catch (error) {
        console.error("Admin API request failed", error);

        return jsonResponse(
            {
                success: false,
                message: "The CRM request could not be completed.",
                error: error instanceof Error
                    ? error.message
                    : String(error)
            },
            500,
            request,
            env
        );
    }
}

async function handleAdminStats(request, env) {
    const totals = await env.DB.prepare(`
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN submission_type = 'project' THEN 1 ELSE 0 END) AS projects,
            SUM(CASE WHEN submission_type = 'contact' THEN 1 ELSE 0 END) AS contacts,
            SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) AS new_count,
            SUM(CASE WHEN status = 'reviewing' THEN 1 ELSE 0 END) AS reviewing,
            SUM(CASE WHEN status = 'quoted' THEN 1 ELSE 0 END) AS quoted,
            SUM(CASE WHEN status = 'follow_up' THEN 1 ELSE 0 END) AS follow_up,
            SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) AS won,
            SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) AS lost,
            SUM(CASE WHEN email_status = 'failed' THEN 1 ELSE 0 END) AS email_failed
        FROM submissions
    `).first();

    const recent = await env.DB.prepare(`
        SELECT
            reference,
            submission_type,
            status,
            brand_name,
            customer_name,
            created_at
        FROM submissions
        ORDER BY created_at DESC
        LIMIT 5
    `).all();

    return jsonResponse(
        {
            success: true,
            stats: {
                total: Number(totals?.total || 0),
                projects: Number(totals?.projects || 0),
                contacts: Number(totals?.contacts || 0),
                new: Number(totals?.new_count || 0),
                reviewing: Number(totals?.reviewing || 0),
                quoted: Number(totals?.quoted || 0),
                followUp: Number(totals?.follow_up || 0),
                won: Number(totals?.won || 0),
                lost: Number(totals?.lost || 0),
                emailFailed: Number(totals?.email_failed || 0)
            },
            recent: recent.results || []
        },
        200,
        request,
        env
    );
}

async function handleAdminSubmissionList(request, env, url) {
    const allowedStatuses = new Set([
        "new",
        "reviewing",
        "quoted",
        "follow_up",
        "won",
        "lost",
        "archived"
    ]);

    const allowedTypes = new Set(["project", "contact"]);
    const requestedStatus = text(url.searchParams.get("status"));
    const requestedType = text(url.searchParams.get("type"));
    const search = text(url.searchParams.get("search")).slice(0, 100);
    const limit = Math.min(
        Math.max(Number(url.searchParams.get("limit")) || 25, 1),
        100
    );
    const offset = Math.max(
        Number(url.searchParams.get("offset")) || 0,
        0
    );

    const where = [];
    const bindings = [];

    if (allowedStatuses.has(requestedStatus)) {
        where.push("status = ?");
        bindings.push(requestedStatus);
    }

    if (allowedTypes.has(requestedType)) {
        where.push("submission_type = ?");
        bindings.push(requestedType);
    }

    if (search) {
        where.push(`(
            reference LIKE ? OR
            brand_name LIKE ? OR
            customer_name LIKE ? OR
            email LIKE ? OR
            phone LIKE ?
        )`);

        const term = `%${search}%`;
        bindings.push(term, term, term, term, term);
    }

    const whereSql = where.length
        ? `WHERE ${where.join(" AND ")}`
        : "";

    const countResult = await env.DB.prepare(`
        SELECT COUNT(*) AS total
        FROM submissions
        ${whereSql}
    `).bind(...bindings).first();

    const rows = await env.DB.prepare(`
        SELECT
            id,
            reference,
            submission_type,
            status,
            customer_name,
            brand_name,
            email,
            phone,
            summary,
            email_status,
            created_at,
            updated_at
        FROM submissions
        ${whereSql}
        ORDER BY created_at DESC
        LIMIT ? OFFSET ?
    `).bind(...bindings, limit, offset).all();

    return jsonResponse(
        {
            success: true,
            submissions: rows.results || [],
            pagination: {
                total: Number(countResult?.total || 0),
                limit,
                offset
            }
        },
        200,
        request,
        env
    );
}

async function handleAdminSubmissionDetail(request, env, reference) {
    const submission = await env.DB.prepare(`
        SELECT *
        FROM submissions
        WHERE reference = ?
        LIMIT 1
    `).bind(reference).first();

    if (!submission) {
        return jsonResponse(
            {
                success: false,
                message: "Submission not found."
            },
            404,
            request,
            env
        );
    }

    let payload = {};

    try {
        payload = JSON.parse(submission.payload_json || "{}");
    } catch (error) {
        console.error("Could not parse submission payload", {
            reference,
            error
        });
    }

    delete submission.payload_json;

    return jsonResponse(
        {
            success: true,
            submission: {
                ...submission,
                payload
            }
        },
        200,
        request,
        env
    );
}


async function handleAdminArtworkList(request, env, reference) {
    if (!env.ARTWORK_BUCKET) {
        return jsonResponse(
            {
                success: false,
                message: "Artwork storage is not configured."
            },
            500,
            request,
            env
        );
    }

    const submission = await getSubmissionWithPayload(
        env.DB,
        reference
    );

    if (!submission) {
        return jsonResponse(
            {
                success: false,
                message: "Submission not found."
            },
            404,
            request,
            env
        );
    }

    const uploadId = getSubmissionArtworkUploadId(
        submission.payload
    );

    await ensureArtworkReviewTable(env.DB);

    const reviewRow = await env.DB.prepare(`
        SELECT
            status,
            notes,
            reviewed_by,
            reviewed_at,
            updated_at
        FROM project_artwork_reviews
        WHERE project_reference = ?
        LIMIT 1
    `).bind(reference).first();

    if (!uploadId) {
        return jsonResponse(
            {
                success: true,
                files: [],
                review: normaliseArtworkReviewRow(reviewRow)
            },
            200,
            request,
            env
        );
    }

    const prefix = `incoming/${uploadId}/`;
    const listedObjects = [];
    let cursor;

    do {
        const result = await env.ARTWORK_BUCKET.list({
            prefix,
            cursor,
            limit: 1000,
            include: ["httpMetadata", "customMetadata"]
        });

        listedObjects.push(...(result.objects || []));
        cursor = result.truncated ? result.cursor : undefined;
    } while (cursor);

    const allowedKeys = getSubmissionArtworkObjectKeys(
        submission.payload
    );

    const files = listedObjects
        .filter(object => (
            !allowedKeys.size ||
            allowedKeys.has(object.key)
        ))
        .map(object => {
            const extension = getArtworkExtension(object.key);
            const originalName =
                text(object.customMetadata?.originalName) ||
                object.key.split("/").pop() ||
                "Artwork file";

            return {
                key: object.key,
                name: originalName,
                extension,
                size: Number(object.size || 0),
                uploadedAt:
                    text(object.customMetadata?.uploadedAt) ||
                    object.uploaded?.toISOString?.() ||
                    null,
                contentType:
                    text(object.httpMetadata?.contentType) ||
                    artworkContentTypeFromExtension(extension),
                kind: artworkFileKind(extension),
                previewable:
                    ["jpg", "jpeg", "png", "webp", "pdf"].includes(extension),
                thumbnailable:
                    ["jpg", "jpeg", "png", "webp"].includes(extension)
            };
        })
        .sort((left, right) => (
            String(left.name).localeCompare(String(right.name))
        ));

    return jsonResponse(
        {
            success: true,
            files,
            review: normaliseArtworkReviewRow(reviewRow)
        },
        200,
        request,
        env
    );
}

async function handleAdminArtworkFile(
    request,
    env,
    url,
    reference
) {
    if (!env.ARTWORK_BUCKET) {
        return jsonResponse(
            {
                success: false,
                message: "Artwork storage is not configured."
            },
            500,
            request,
            env
        );
    }

    const submission = await getSubmissionWithPayload(
        env.DB,
        reference
    );

    if (!submission) {
        return jsonResponse(
            {
                success: false,
                message: "Submission not found."
            },
            404,
            request,
            env
        );
    }

    const uploadId = getSubmissionArtworkUploadId(
        submission.payload
    );
    const key = text(url.searchParams.get("key"));

    if (
        !uploadId ||
        !key ||
        !key.startsWith(`incoming/${uploadId}/`) ||
        key.includes("..") ||
        key.includes("\\")
    ) {
        return jsonResponse(
            {
                success: false,
                message: "The requested artwork file is invalid."
            },
            400,
            request,
            env
        );
    }

    const allowedKeys = getSubmissionArtworkObjectKeys(
        submission.payload
    );

    if (allowedKeys.size && !allowedKeys.has(key)) {
        return jsonResponse(
            {
                success: false,
                message: "This artwork file does not belong to the project."
            },
            403,
            request,
            env
        );
    }

    const object = await env.ARTWORK_BUCKET.get(key);

    if (!object) {
        return jsonResponse(
            {
                success: false,
                message: "Artwork file not found."
            },
            404,
            request,
            env
        );
    }

    const extension = getArtworkExtension(key);
    const originalName =
        text(object.customMetadata?.originalName) ||
        key.split("/").pop() ||
        "luxsome-artwork";
    const requestedDisposition =
        text(url.searchParams.get("disposition")) === "inline"
            ? "inline"
            : "attachment";
    const mayDisplayInline =
        ["jpg", "jpeg", "png", "webp", "pdf"].includes(extension);
    const disposition =
        requestedDisposition === "inline" && mayDisplayInline
            ? "inline"
            : "attachment";

    const headers = new Headers();
    object.writeHttpMetadata(headers);

    headers.set(
        "Content-Type",
        headers.get("Content-Type") ||
        artworkContentTypeFromExtension(extension)
    );
    headers.set(
        "Content-Disposition",
        `${disposition}; filename*=UTF-8''${encodeURIComponent(originalName)}`
    );
    headers.set("Cache-Control", "private, max-age=60");
    headers.set("X-Content-Type-Options", "nosniff");

    if (disposition === "inline") {
        headers.set(
            "Content-Security-Policy",
            "default-src 'none'; img-src 'self' data: blob:; style-src 'unsafe-inline'; sandbox"
        );
    }

    return new Response(object.body, {
        status: 200,
        headers
    });
}

async function handleAdminArtworkReviewUpdate(
    request,
    env,
    reference
) {
    const submission = await env.DB.prepare(`
        SELECT reference
        FROM submissions
        WHERE reference = ?
        LIMIT 1
    `).bind(reference).first();

    if (!submission) {
        return jsonResponse(
            {
                success: false,
                message: "Submission not found."
            },
            404,
            request,
            env
        );
    }

    const body = await request.json().catch(() => ({}));
    const allowedStatuses = new Set([
        "pending_review",
        "reviewing",
        "needs_changes",
        "approved",
        "production_ready"
    ]);
    const status = text(body.status);

    if (!allowedStatuses.has(status)) {
        return jsonResponse(
            {
                success: false,
                message: "Please select a valid artwork review status."
            },
            422,
            request,
            env
        );
    }

    const notes = text(body.notes).slice(0, 4000);
    const reviewedBy = text(body.reviewedBy).slice(0, 120);
    const now = new Date().toISOString();
    const reviewedAt =
        status === "pending_review"
            ? null
            : now;

    await ensureArtworkReviewTable(env.DB);

    await env.DB.prepare(`
        INSERT INTO project_artwork_reviews (
            project_reference,
            status,
            notes,
            reviewed_by,
            reviewed_at,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(project_reference) DO UPDATE SET
            status = excluded.status,
            notes = excluded.notes,
            reviewed_by = excluded.reviewed_by,
            reviewed_at = excluded.reviewed_at,
            updated_at = excluded.updated_at
    `).bind(
        reference,
        status,
        notes || null,
        reviewedBy || null,
        reviewedAt,
        now,
        now
    ).run();

    return jsonResponse(
        {
            success: true,
            message: "Artwork review saved.",
            review: {
                status,
                notes,
                reviewedBy,
                reviewedAt,
                updatedAt: now
            }
        },
        200,
        request,
        env
    );
}

async function getSubmissionWithPayload(db, reference) {
    const submission = await db.prepare(`
        SELECT reference, submission_type, payload_json
        FROM submissions
        WHERE reference = ?
        LIMIT 1
    `).bind(reference).first();

    if (!submission) return null;

    let payload = {};

    try {
        payload = JSON.parse(submission.payload_json || "{}");
    } catch (_) {
        payload = {};
    }

    return {
        ...submission,
        payload
    };
}

function getSubmissionArtworkUploadId(payload) {
    const direct = normaliseArtworkUploadId(
        payload?.artwork_upload_id
    );

    if (direct) return direct;

    const configuration = parseProjectConfiguration(payload);

    return normaliseArtworkUploadId(
        configuration?.artwork_upload_id
    );
}

function getSubmissionArtworkObjectKeys(payload) {
    const configuration = parseProjectConfiguration(payload);
    const value =
        payload?.artwork_object_keys ||
        configuration?.artwork_object_keys ||
        "";

    const keys = Array.isArray(value)
        ? value
        : String(value)
            .split(",")
            .map(item => item.trim())
            .filter(Boolean);

    return new Set(
        keys.filter(key => key.startsWith("incoming/"))
    );
}

async function ensureArtworkReviewTable(db) {
    await db.prepare(`
        CREATE TABLE IF NOT EXISTS project_artwork_reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            project_reference TEXT NOT NULL UNIQUE,
            status TEXT NOT NULL DEFAULT 'pending_review',
            notes TEXT,
            reviewed_by TEXT,
            reviewed_at TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (project_reference)
                REFERENCES submissions(reference)
                ON DELETE CASCADE
        )
    `).run();

    await db.prepare(`
        CREATE INDEX IF NOT EXISTS
            idx_project_artwork_reviews_reference
        ON project_artwork_reviews(project_reference)
    `).run();
}

function normaliseArtworkReviewRow(row) {
    return {
        status: text(row?.status) || "pending_review",
        notes: text(row?.notes),
        reviewedBy: text(row?.reviewed_by),
        reviewedAt: row?.reviewed_at || null,
        updatedAt: row?.updated_at || null
    };
}

function artworkFileKind(extension) {
    if (["jpg", "jpeg", "png", "webp", "svg", "tif", "tiff"].includes(extension)) {
        return "image";
    }

    if (extension === "pdf") return "pdf";
    if (["ai", "eps"].includes(extension)) return "vector";
    if (extension === "psd") return "design";
    if (extension === "zip") return "archive";

    return "file";
}

function artworkContentTypeFromExtension(extension) {
    return {
        pdf: "application/pdf",
        ai: "application/postscript",
        eps: "application/postscript",
        svg: "image/svg+xml",
        psd: "image/vnd.adobe.photoshop",
        tif: "image/tiff",
        tiff: "image/tiff",
        png: "image/png",
        jpg: "image/jpeg",
        jpeg: "image/jpeg",
        webp: "image/webp",
        zip: "application/zip"
    }[extension] || "application/octet-stream";
}


async function handleAdminSubmissionUpdate(request, env, reference) {
    const body = await request.json().catch(() => ({}));
    const allowedStatuses = new Set([
        "new",
        "reviewing",
        "quoted",
        "follow_up",
        "won",
        "lost",
        "archived"
    ]);
    const status = text(body.status);

    if (!allowedStatuses.has(status)) {
        return jsonResponse(
            {
                success: false,
                message: "Please select a valid lead status."
            },
            422,
            request,
            env
        );
    }

    const result = await env.DB.prepare(`
        UPDATE submissions
        SET status = ?, updated_at = ?
        WHERE reference = ?
    `).bind(
        status,
        new Date().toISOString(),
        reference
    ).run();

    if (!result.meta?.changes) {
        return jsonResponse(
            {
                success: false,
                message: "Submission not found."
            },
            404,
            request,
            env
        );
    }

    return jsonResponse(
        {
            success: true,
            message: "Lead status updated.",
            reference,
            status
        },
        200,
        request,
        env
    );
}




async function handleAdminOrderList(request, env, url) {
    const allowedStatuses = new Set([
        "new",
        "design_pending",
        "awaiting_approval",
        "materials_sourcing",
        "in_production",
        "quality_check",
        "ready_for_delivery",
        "completed",
        "cancelled"
    ]);

    const status = text(url.searchParams.get("status"));
    const search = text(url.searchParams.get("search")).slice(0, 100);
    const view = text(url.searchParams.get("view"));
    const limit = Math.min(
        Math.max(Number(url.searchParams.get("limit")) || 50, 1),
        100
    );

    const where = [];
    const bindings = [];

    if (allowedStatuses.has(status)) {
        where.push("o.status = ?");
        bindings.push(status);
    }

    if (view === "active") {
        where.push("o.status NOT IN ('completed', 'cancelled')");
    }

    if (view === "overdue") {
        where.push(`
            o.production_deadline IS NOT NULL
            AND o.production_deadline < date('now')
            AND o.status NOT IN ('completed', 'cancelled')
        `);
    }

    if (search) {
        const term = `%${search}%`;
        where.push(`
            (
                o.order_reference LIKE ?
                OR o.customer_name LIKE ?
                OR o.brand_name LIKE ?
                OR i.invoice_reference LIKE ?
            )
        `);
        bindings.push(term, term, term, term);
    }

    const whereSql = where.length
        ? `WHERE ${where.join(" AND ")}`
        : "";

    const result = await env.DB.prepare(`
        SELECT
            o.*,
            i.invoice_reference,
            i.grand_total,
            i.amount_paid,
            i.balance_due,
            i.currency,
            q.quote_reference,
            COUNT(oi.id) AS item_count
        FROM orders o
        INNER JOIN invoices i ON i.id = o.invoice_id
        LEFT JOIN quotations q ON q.id = o.quotation_id
        LEFT JOIN order_items oi ON oi.order_id = o.id
        ${whereSql}
        GROUP BY o.id
        ORDER BY
            CASE o.priority
                WHEN 'urgent' THEN 1
                WHEN 'high' THEN 2
                WHEN 'normal' THEN 3
                ELSE 4
            END,
            COALESCE(o.production_deadline, '9999-12-31'),
            o.created_at DESC
        LIMIT ?
    `).bind(...bindings, limit).all();

    return jsonResponse(
        {
            success: true,
            orders: result.results || []
        },
        200,
        request,
        env
    );
}

async function handleAdminOrderFromInvoice(
    request,
    env,
    invoiceReference
) {
    const invoice = await env.DB.prepare(`
        SELECT *
        FROM invoices
        WHERE invoice_reference = ?
        LIMIT 1
    `).bind(invoiceReference).first();

    if (!invoice) {
        return jsonResponse(
            {
                success: false,
                message: "Invoice not found."
            },
            404,
            request,
            env
        );
    }

    if (
        !["partially_paid", "paid"].includes(invoice.status) &&
        Number(invoice.amount_paid || 0) <= 0
    ) {
        return jsonResponse(
            {
                success: false,
                message:
                    "Record at least one verified payment before creating an order."
            },
            409,
            request,
            env
        );
    }

    const existing = await env.DB.prepare(`
        SELECT order_reference
        FROM orders
        WHERE invoice_id = ?
        LIMIT 1
    `).bind(invoice.id).first();

    if (existing) {
        return jsonResponse(
            {
                success: false,
                message: "An order already exists for this invoice.",
                orderReference: existing.order_reference
            },
            409,
            request,
            env
        );
    }

    const body = await request.json().catch(() => ({}));
    const now = new Date().toISOString();
    const orderReference = await generateOrderReference(env.DB);
    const paymentStatus = getOrderPaymentStatus(invoice);

    const result = await env.DB.prepare(`
        INSERT INTO orders (
            order_reference,
            invoice_id,
            quotation_id,
            customer_id,
            customer_name,
            brand_name,
            customer_email,
            customer_phone,
            status,
            priority,
            assigned_to,
            design_status,
            production_status,
            payment_status,
            production_deadline,
            expected_delivery_date,
            delivery_method,
            delivery_address,
            customer_instructions,
            internal_notes,
            created_at,
            updated_at
        )
        VALUES (
            ?, ?, ?, ?, ?, ?, ?, ?,
            'new', ?, ?,
            'not_started', 'not_started', ?,
            ?, ?, ?, ?, ?, ?, ?, ?
        )
    `).bind(
        orderReference,
        invoice.id,
        invoice.quotation_id || null,
        invoice.customer_id || null,
        invoice.customer_name,
        invoice.brand_name,
        invoice.customer_email,
        invoice.customer_phone,
        normaliseOrderPriority(body.priority),
        text(body.assignedTo) || null,
        paymentStatus,
        text(body.productionDeadline) || null,
        text(body.expectedDeliveryDate) || null,
        text(body.deliveryMethod) || null,
        text(body.deliveryAddress) || null,
        text(body.customerInstructions) || invoice.customer_note || null,
        text(body.internalNotes) || null,
        now,
        now
    ).run();

    const orderId = result.meta?.last_row_id;

    if (!orderId) {
        throw new Error("The order could not be created.");
    }

    const items = await env.DB.prepare(`
        SELECT
            item_order,
            description,
            details,
            quantity,
            unit_price,
            line_total
        FROM invoice_items
        WHERE invoice_id = ?
        ORDER BY item_order, id
    `).bind(invoice.id).all();

    for (const item of items.results || []) {
        await env.DB.prepare(`
            INSERT INTO order_items (
                order_id,
                item_order,
                description,
                details,
                quantity,
                unit_price,
                line_total,
                production_notes,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)
        `).bind(
            orderId,
            item.item_order,
            item.description,
            item.details,
            item.quantity,
            item.unit_price,
            item.line_total,
            now,
            now
        ).run();
    }

    await recordOrderActivity(env.DB, {
        orderId,
        activityType: "order_created",
        title: "Order created",
        details:
            `${orderReference} was created from ${invoiceReference}.`,
        createdAt: now
    });

    return jsonResponse(
        {
            success: true,
            message: "Order created from invoice.",
            order: {
                orderReference,
                status: "new"
            }
        },
        201,
        request,
        env
    );
}

async function handleAdminOrderDetail(
    request,
    env,
    orderReference
) {
    const order = await env.DB.prepare(`
        SELECT
            o.*,
            i.invoice_reference,
            i.grand_total,
            i.amount_paid,
            i.balance_due,
            i.currency,
            q.quote_reference
        FROM orders o
        INNER JOIN invoices i ON i.id = o.invoice_id
        LEFT JOIN quotations q ON q.id = o.quotation_id
        WHERE o.order_reference = ?
        LIMIT 1
    `).bind(orderReference).first();

    if (!order) {
        return jsonResponse(
            {
                success: false,
                message: "Order not found."
            },
            404,
            request,
            env
        );
    }

    const items = await env.DB.prepare(`
        SELECT
            id,
            item_order,
            description,
            details,
            quantity,
            unit_price,
            line_total,
            production_notes
        FROM order_items
        WHERE order_id = ?
        ORDER BY item_order, id
    `).bind(order.id).all();

    return jsonResponse(
        {
            success: true,
            order: {
                ...order,
                items: items.results || []
            }
        },
        200,
        request,
        env
    );
}

async function handleAdminOrderUpdate(
    request,
    env,
    orderReference
) {
    const existing = await env.DB.prepare(`
        SELECT *
        FROM orders
        WHERE order_reference = ?
        LIMIT 1
    `).bind(orderReference).first();

    if (!existing) {
        return jsonResponse(
            {
                success: false,
                message: "Order not found."
            },
            404,
            request,
            env
        );
    }

    const invoicePayment = await env.DB.prepare(`
        SELECT
            grand_total,
            amount_paid
        FROM invoices
        WHERE id = ?
        LIMIT 1
    `).bind(existing.invoice_id).first();

    const invoiceTotal = Number(
        invoicePayment?.grand_total || 0
    );

    const invoiceAmountPaid = Number(
        invoicePayment?.amount_paid || 0
    );

    const paymentPercentage =
        invoiceTotal > 0
            ? (invoiceAmountPaid / invoiceTotal) * 100
            : 0;

    const body = await request.json().catch(() => ({}));
    const requestedPortalEnabled =
        body.portalEnabled === true ||
        body.portalEnabled === 1 ||
        body.portalEnabled === "1";

    if (
        requestedPortalEnabled &&
        paymentPercentage < 70
    ) {
        return jsonResponse(
            {
                success: false,
                message:
                    "The client portal can only be enabled after at least 70% of the invoice has been paid.",
                paymentPercentage: Number(
                    paymentPercentage.toFixed(2)
                )
            },
            409,
            request,
            env
        );
    }

    const status = normaliseOrderStatus(
        body.status ?? existing.status
    );
    const priority = normaliseOrderPriority(
        body.priority ?? existing.priority
    );
    const designStatus = normaliseDesignStatus(
        body.designStatus ?? existing.design_status
    );
    const productionStatus = normaliseProductionStatus(
        body.productionStatus ?? existing.production_status
    );
    const now = new Date().toISOString();
    const completedAt =
        status === "completed"
            ? existing.completed_at || now
            : null;

    const portalEnabled = requestedPortalEnabled ? 1 : 0;
    const portalToken =
        portalEnabled
            ? existing.portal_token || generateClientPortalToken()
            : null;
    const portalActivatedAt =
        portalEnabled
            ? existing.portal_activated_at || now
            : null;
    const portalUpdatedAt = portalEnabled ? now : null;
    const portalExpiresAt =
        portalEnabled && completedAt
            ? addDaysToIso(completedAt, 20)
            : null;
    const clientProgressStage = normaliseClientProgressStage(
        body.clientProgressStage ??
        existing.client_progress_stage ??
        mapOrderStatusToClientStage(status)
    );
    const clientProgressNote =
        text(
            body.clientProgressNote ??
            existing.client_progress_note
        ) || null;

    await env.DB.prepare(`
        UPDATE orders
        SET
            status = ?,
            priority = ?,
            assigned_to = ?,
            design_status = ?,
            production_status = ?,
            production_deadline = ?,
            expected_delivery_date = ?,
            delivery_method = ?,
            delivery_address = ?,
            customer_instructions = ?,
            internal_notes = ?,
            completed_at = ?,
            portal_enabled = ?,
            portal_token = ?,
            client_progress_stage = ?,
            client_progress_note = ?,
            portal_activated_at = ?,
            portal_updated_at = ?,
            portal_expires_at = ?,
            updated_at = ?
        WHERE id = ?
    `).bind(
        status,
        priority,
        text(body.assignedTo ?? existing.assigned_to) || null,
        designStatus,
        productionStatus,
        text(
            body.productionDeadline ??
            existing.production_deadline
        ) || null,
        text(
            body.expectedDeliveryDate ??
            existing.expected_delivery_date
        ) || null,
        text(body.deliveryMethod ?? existing.delivery_method) || null,
        text(body.deliveryAddress ?? existing.delivery_address) || null,
        text(
            body.customerInstructions ??
            existing.customer_instructions
        ) || null,
        text(body.internalNotes ?? existing.internal_notes) || null,
        completedAt,
        portalEnabled,
        portalToken,
        clientProgressStage,
        clientProgressNote,
        portalActivatedAt,
        portalUpdatedAt,
        portalExpiresAt,
        now,
        existing.id
    ).run();

    if (Array.isArray(body.items)) {
        for (const item of body.items) {
            const itemId = Number(item.id);

            if (!itemId) {
                continue;
            }

            await env.DB.prepare(`
                UPDATE order_items
                SET
                    production_notes = ?,
                    updated_at = ?
                WHERE id = ? AND order_id = ?
            `).bind(
                text(item.productionNotes) || null,
                now,
                itemId,
                existing.id
            ).run();
        }
    }

    const changes = [];

    if (status !== existing.status) {
        changes.push(
            `Status changed from ${existing.status} to ${status}.`
        );
    }

    if (productionStatus !== existing.production_status) {
        changes.push(
            `Production changed from ` +
            `${existing.production_status} to ${productionStatus}.`
        );
    }

    if (designStatus !== existing.design_status) {
        changes.push(
            `Design changed from ` +
            `${existing.design_status} to ${designStatus}.`
        );
    }

    if (portalEnabled !== Number(existing.portal_enabled || 0)) {
        changes.push(
            portalEnabled
                ? "Client tracking portal enabled."
                : "Client tracking portal disabled."
        );
    }

    if (
        clientProgressStage !==
        (existing.client_progress_stage || "")
    ) {
        changes.push(
            `Client progress changed to ${clientProgressStage}.`
        );
    }

    await recordOrderActivity(env.DB, {
        orderId: existing.id,
        activityType: "order_updated",
        title: "Order updated",
        details: changes.length
            ? changes.join(" ")
            : "Order details were updated.",
        createdAt: now
    });

    return jsonResponse(
        {
            success: true,
            message: "Order updated.",
            order: {
                orderReference,
                status,
                designStatus,
                productionStatus,
                portalEnabled: Boolean(portalEnabled),
                portalToken,
                portalUrl: portalToken
                    ? buildClientPortalUrl(portalToken, env)
                    : null,
                clientProgressStage,
                clientProgressNote,
                portalExpiresAt,
                paymentPercentage: Number(
                    paymentPercentage.toFixed(2)
                )
            }
        },
        200,
        request,
        env
    );
}

async function handleAdminOrderActivity(
    request,
    env,
    orderReference
) {
    const order = await env.DB.prepare(`
        SELECT id
        FROM orders
        WHERE order_reference = ?
        LIMIT 1
    `).bind(orderReference).first();

    if (!order) {
        return jsonResponse(
            {
                success: false,
                message: "Order not found."
            },
            404,
            request,
            env
        );
    }

    const result = await env.DB.prepare(`
        SELECT
            id,
            activity_type,
            title,
            details,
            actor,
            created_at
        FROM order_activity
        WHERE order_id = ?
        ORDER BY created_at DESC, id DESC
    `).bind(order.id).all();

    return jsonResponse(
        {
            success: true,
            activity: result.results || []
        },
        200,
        request,
        env
    );
}



async function handleAdminOrderTrackingEmail(request, env, orderReference) {
    if (!env.RESEND_API_KEY || !env.FROM_EMAIL) {
        return jsonResponse(
            { success: false, message: "Tracking email delivery is not configured." },
            500, request, env
        );
    }

    const order = await env.DB.prepare(`
        SELECT
            o.id, o.order_reference, o.customer_name, o.brand_name,
            o.customer_email, o.portal_enabled, o.portal_token,
            o.client_progress_stage, o.client_progress_note,
            o.expected_delivery_date
        FROM orders o
        WHERE o.order_reference = ?
        LIMIT 1
    `).bind(orderReference).first();

    if (!order) {
        return jsonResponse(
            { success: false, message: "Order not found." },
            404, request, env
        );
    }

    if (!Number(order.portal_enabled || 0) || !text(order.portal_token)) {
        return jsonResponse(
            {
                success: false,
                message: "Enable and save the client portal before sending its tracking link."
            },
            409, request, env
        );
    }

    const customerEmail = text(order.customer_email).toLowerCase();

    if (!isValidEmail(customerEmail)) {
        return jsonResponse(
            {
                success: false,
                message: "This order does not have a valid customer email address."
            },
            422, request, env
        );
    }

    const trackingUrl = buildClientPortalUrl(order.portal_token, env);
    const clientName =
        text(order.brand_name) || text(order.customer_name) || "there";

    const stageLabel = {
        payment_confirmed: "Payment confirmed",
        artwork_specification: "Artwork and specification",
        production: "Production",
        quality_check: "Quality check",
        ready_for_delivery: "Ready for delivery",
        delivered: "Delivered"
    }[normaliseClientProgressStage(order.client_progress_stage)];

    const payload = {
        from: env.FROM_EMAIL,
        to: [customerEmail],
        subject: `Track your Luxsome order ${order.order_reference}`,
        html: buildClientTrackingEmailHtml({
            clientName,
            orderReference: order.order_reference,
            stageLabel,
            progressNote: order.client_progress_note,
            expectedDeliveryDate: order.expected_delivery_date,
            trackingUrl
        })
    };

    if (env.REPLY_TO_EMAIL) payload.reply_to = env.REPLY_TO_EMAIL;

    const response = await fetch(RESEND_EMAIL_ENDPOINT, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    const resendData = await safeJson(response);

    if (!response.ok) {
        return jsonResponse(
            {
                success: false,
                message: "The tracking email could not be sent.",
                error: text(resendData?.message) || "Resend rejected the email."
            },
            502, request, env
        );
    }

    await recordOrderActivity(env.DB, {
        orderId: order.id,
        activityType: "tracking_link_sent",
        title: "Client tracking link sent",
        details: `Tracking access was emailed to ${customerEmail}.`,
        createdAt: new Date().toISOString()
    });

    return jsonResponse(
        {
            success: true,
            message: `Tracking link emailed to ${customerEmail}.`
        },
        200, request, env
    );
}

function buildClientTrackingEmailHtml({
    clientName,
    orderReference,
    stageLabel,
    progressNote,
    expectedDeliveryDate,
    trackingUrl
}) {
    const delivery = expectedDeliveryDate
        ? `<p style="margin:8px 0 0;color:#756159;font-size:14px;">
            <strong style="color:#211713;">Expected delivery:</strong>
            ${escapeHtml(expectedDeliveryDate)}
        </p>`
        : "";

    const note = text(progressNote)
        ? `<div style="margin:24px 0;padding:18px;background:#f8f4ef;border-left:3px solid #673629;">
            <p style="margin:0;color:#55413a;font-size:14px;line-height:1.7;">
                ${escapeHtml(progressNote)}
            </p>
        </div>`
        : "";

    return `
        <div style="margin:0;padding:30px 16px;background:#f2ebe5;font-family:Arial,sans-serif;color:#211713;">
            <div style="max-width:640px;margin:auto;background:#fffdf9;border:1px solid #e5d9d1;">
                <div style="padding:30px;border-bottom:1px solid #e5d9d1;">
                    <p style="margin:0 0 10px;color:#673629;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">
                        Luxsome Order Tracking
                    </p>
                    <h1 style="margin:0;font-family:Georgia,serif;font-size:36px;font-weight:400;">
                        Your order is now trackable.
                    </h1>
                </div>
                <div style="padding:28px 30px 32px;">
                    <p style="color:#55413a;font-size:15px;line-height:1.7;">
                        Hello ${escapeHtml(clientName)},
                    </p>
                    <p style="color:#55413a;font-size:15px;line-height:1.7;">
                        Follow your Luxsome packaging order using the private link below.
                    </p>
                    <div style="margin:24px 0;padding:18px;border:1px solid #e5d9d1;">
                        <p style="margin:0;color:#756159;font-size:12px;text-transform:uppercase;letter-spacing:1px;">
                            Order reference
                        </p>
                        <p style="margin:5px 0 15px;font-size:20px;font-weight:700;">
                            ${escapeHtml(orderReference)}
                        </p>
                        <p style="margin:0;color:#756159;font-size:12px;text-transform:uppercase;letter-spacing:1px;">
                            Current stage
                        </p>
                        <p style="margin:5px 0 0;font-family:Georgia,serif;font-size:25px;">
                            ${escapeHtml(stageLabel)}
                        </p>
                        ${delivery}
                    </div>
                    ${note}
                    <p style="margin:26px 0;text-align:center;">
                        <a href="${escapeHtml(trackingUrl)}"
                           style="display:inline-block;padding:15px 24px;background:#881010;color:#fff;font-size:12px;font-weight:700;letter-spacing:1px;text-decoration:none;text-transform:uppercase;border-radius:8px">
                            Track my order
                        </a>
                    </p>
                    <p style="color:#806e66;font-size:12px;line-height:1.6;">
                        This is a private link. Please do not forward it.
                        Access remains available until 20 days after completion.
                    </p>
                </div>
            </div>
        </div>
    `;
}

async function handlePublicOrderTrackingRequest(
    request,
    env,
    url
) {
    if (request.method !== "GET") {
        return jsonResponse(
            {
                success: false,
                message: "Method not allowed."
            },
            405,
            request,
            env
        );
    }

    const match = url.pathname.match(
        /^\/public\/order-tracking\/([A-Za-z0-9_-]+)$/
    );

    if (!match) {
        return jsonResponse(
            {
                success: false,
                message: "Tracking link is invalid."
            },
            404,
            request,
            env
        );
    }

    await expireCompletedClientPortals(env.DB);

    const token = text(match[1]);

    const order = await env.DB.prepare(`
        SELECT
            o.id,
            o.order_reference,
            o.customer_name,
            o.brand_name,
            o.status,
            o.design_status,
            o.production_status,
            o.client_progress_stage,
            o.client_progress_note,
            o.expected_delivery_date,
            o.delivery_method,
            o.completed_at,
            o.portal_updated_at,
            o.portal_expires_at,
            i.invoice_reference,
            i.currency
        FROM orders o
        INNER JOIN invoices i ON i.id = o.invoice_id
        WHERE
            o.portal_token = ?
            AND o.portal_enabled = 1
        LIMIT 1
    `).bind(token).first();

    if (!order) {
        return jsonResponse(
            {
                success: false,
                message:
                    "This tracking link is invalid or has expired."
            },
            404,
            request,
            env
        );
    }

    const items = await env.DB.prepare(`
        SELECT
            description,
            details,
            quantity
        FROM order_items
        WHERE order_id = ?
        ORDER BY item_order, id
    `).bind(order.id).all();

    return jsonResponse(
        {
            success: true,
            order: {
                orderReference: order.order_reference,
                invoiceReference: order.invoice_reference,
                clientName: order.customer_name,
                brandName: order.brand_name,
                stage:
                    order.client_progress_stage ||
                    mapOrderStatusToClientStage(order.status),
                progressNote:
                    order.client_progress_note || "",
                expectedDeliveryDate:
                    order.expected_delivery_date || null,
                deliveryMethod:
                    order.delivery_method || null,
                completedAt: order.completed_at || null,
                lastUpdated:
                    order.portal_updated_at || null,
                expiresAt:
                    order.portal_expires_at || null,
                items: (items.results || []).map(item => ({
                    description: item.description,
                    details: item.details,
                    quantity: item.quantity
                }))
            }
        },
        200,
        request,
        env
    );
}

async function expireCompletedClientPortals(db) {
    const expiryThreshold = new Date(
        Date.now() - 20 * 86400000
    ).toISOString();

    await db.prepare(`
        UPDATE orders
        SET
            portal_enabled = 0,
            portal_token = NULL,
            portal_expires_at = NULL,
            portal_updated_at = ?
        WHERE
            portal_enabled = 1
            AND completed_at IS NOT NULL
            AND completed_at <= ?
    `).bind(
        new Date().toISOString(),
        expiryThreshold
    ).run();
}

function normaliseClientProgressStage(value) {
    const allowed = new Set([
        "payment_confirmed",
        "artwork_specification",
        "production",
        "quality_check",
        "ready_for_delivery",
        "delivered"
    ]);

    const stage = text(value);

    return allowed.has(stage)
        ? stage
        : "payment_confirmed";
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
        completed: "delivered",
        cancelled: "payment_confirmed"
    };

    return map[status] || "payment_confirmed";
}

function generateClientPortalToken() {
    return [
        crypto.randomUUID().replaceAll("-", ""),
        crypto.randomUUID().replaceAll("-", "")
    ].join("");
}

function addDaysToIso(value, days) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return null;

    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString();
}

function buildClientPortalUrl(token, env) {
    const base = text(env.CLIENT_PORTAL_URL) ||
        "https://www.luxsomepackaging.com/track-order/";

    const url = new URL(base);
    url.searchParams.set("token", token);
    return url.toString();
}

async function generateOrderReference(db) {
    const year = new Date().getUTCFullYear();
    const prefix = `ORD-${year}-`;

    const last = await db.prepare(`
        SELECT order_reference
        FROM orders
        WHERE order_reference LIKE ?
        ORDER BY order_reference DESC
        LIMIT 1
    `).bind(`${prefix}%`).first();

    const nextNumber = last
        ? Number(last.order_reference.split("-").pop()) + 1
        : 1;

    return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}

function getOrderPaymentStatus(invoice) {
    const total = Number(invoice.grand_total || 0);
    const paid = Number(invoice.amount_paid || 0);

    if (total > 0 && paid >= total) {
        return "paid";
    }

    if (paid > 0) {
        return "partially_paid";
    }

    return "unpaid";
}

function normaliseOrderStatus(value) {
    const allowed = new Set([
        "new",
        "design_pending",
        "awaiting_approval",
        "materials_sourcing",
        "in_production",
        "quality_check",
        "ready_for_delivery",
        "completed",
        "cancelled"
    ]);

    const status = text(value);

    return allowed.has(status)
        ? status
        : "new";
}

function normaliseOrderPriority(value) {
    const allowed = new Set([
        "low",
        "normal",
        "high",
        "urgent"
    ]);

    const priority = text(value);

    return allowed.has(priority)
        ? priority
        : "normal";
}

function normaliseDesignStatus(value) {
    const allowed = new Set([
        "not_started",
        "in_progress",
        "awaiting_customer",
        "approved"
    ]);

    const status = text(value);

    return allowed.has(status)
        ? status
        : "not_started";
}

function normaliseProductionStatus(value) {
    const allowed = new Set([
        "not_started",
        "materials_sourcing",
        "in_production",
        "quality_check",
        "ready"
    ]);

    const status = text(value);

    return allowed.has(status)
        ? status
        : "not_started";
}

async function recordOrderActivity(
    db,
    {
        orderId,
        activityType,
        title,
        details = "",
        actor = "admin",
        createdAt
    }
) {
    await db.prepare(`
        INSERT INTO order_activity (
            order_id,
            activity_type,
            title,
            details,
            actor,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
        orderId,
        activityType,
        title,
        details || null,
        actor,
        createdAt
    ).run();
}


async function handleAdminInvoiceList(request, env, url) {
    const allowed = new Set(["draft","sent","partially_paid","paid","overdue","cancelled","void"]);
    const status = text(url.searchParams.get("status"));
    const search = text(url.searchParams.get("search")).slice(0,100);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 25,1),100);
    const offset = Math.max(Number(url.searchParams.get("offset")) || 0,0);
    const where=[]; const bindings=[];
    if (allowed.has(status)) { where.push("i.status = ?"); bindings.push(status); }
    if (search) { const term=`%${search}%`; where.push("(i.invoice_reference LIKE ? OR i.customer_name LIKE ? OR i.brand_name LIKE ? OR i.customer_email LIKE ?)"); bindings.push(term,term,term,term); }
    const whereSql=where.length?`WHERE ${where.join(" AND ")}`:"";
    const count=await env.DB.prepare(`SELECT COUNT(*) total FROM invoices i ${whereSql}`).bind(...bindings).first();
    const rows=await env.DB.prepare(`
        SELECT i.*, q.quote_reference, COUNT(ii.id) item_count
        FROM invoices i
        LEFT JOIN quotations q ON q.id=i.quotation_id
        LEFT JOIN invoice_items ii ON ii.invoice_id=i.id
        ${whereSql}
        GROUP BY i.id
        ORDER BY i.created_at DESC
        LIMIT ? OFFSET ?
    `).bind(...bindings,limit,offset).all();
    return jsonResponse({success:true,invoices:rows.results||[],pagination:{total:Number(count?.total||0),limit,offset}},200,request,env);
}

async function handleAdminInvoiceCreate(request, env) {
    const body=await request.json().catch(()=>({}));
    const validation=validateInvoicePayload(body);
    if (validation.errors.length) return jsonResponse({success:false,message:validation.errors[0],errors:validation.errors.map(message=>({message}))},422,request,env);
    const data=validation.data;
    data.paymentInstructions =
        text(data.paymentInstructions) ||
        text(env.INVOICE_PAYMENT_INSTRUCTIONS);
    const now=new Date().toISOString();
    const reference=await generateInvoiceReference(env.DB);
    const totals=calculateInvoiceTotals(data);
    const customerId=await upsertQuotationCustomer(env.DB,{customerName:data.customerName,brandName:data.brandName,email:data.customerEmail,phone:data.customerPhone,now});
    const result=await env.DB.prepare(`INSERT INTO invoices (
        invoice_reference,quotation_id,customer_id,status,customer_name,brand_name,customer_email,customer_phone,currency,issue_date,due_date,
        subtotal,discount,delivery_fee,tax,grand_total,amount_paid,balance_due,payment_terms,payment_instructions,customer_note,internal_note,created_at,updated_at
    ) VALUES (?,NULL,?,'draft',?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,?,?,?,?,?)`).bind(
        reference,customerId,data.customerName,data.brandName,data.customerEmail,data.customerPhone,data.currency,data.issueDate,data.dueDate,
        totals.subtotal,totals.discount,totals.deliveryFee,totals.tax,totals.grandTotal,totals.grandTotal,
        data.paymentTerms,data.paymentInstructions,data.customerNote,data.internalNote,now,now
    ).run();
    const id=result.meta?.last_row_id; if(!id) throw new Error("Invoice could not be created.");
    await replaceInvoiceItems(env.DB,id,data.items,now);
    return jsonResponse({success:true,message:"Invoice draft created.",invoice:{invoiceReference:reference,status:"draft",grandTotal:totals.grandTotal,balanceDue:totals.grandTotal}},201,request,env);
}

async function handleAdminInvoiceFromQuotation(request, env, quoteReference) {
    const q=await env.DB.prepare(`SELECT * FROM quotations WHERE quote_reference=? LIMIT 1`).bind(quoteReference).first();
    if(!q) return jsonResponse({success:false,message:"Quotation not found."},404,request,env);
    if(q.status!=="accepted") return jsonResponse({success:false,message:"Only accepted quotations can be converted to invoices."},409,request,env);
    const existing=await env.DB.prepare(`SELECT invoice_reference FROM invoices WHERE quotation_id=? AND status NOT IN ('cancelled','void') LIMIT 1`).bind(q.id).first();
    if(existing) return jsonResponse({success:false,message:"An active invoice already exists for this quotation.",invoiceReference:existing.invoice_reference},409,request,env);
    const items=await env.DB.prepare(`SELECT item_order,description,details,quantity,unit_price,line_total FROM quotation_items WHERE quotation_id=? ORDER BY item_order,id`).bind(q.id).all();
    const now=new Date().toISOString(); const reference=await generateInvoiceReference(env.DB);
    const issue=now.slice(0,10); const due=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
    const result=await env.DB.prepare(`INSERT INTO invoices (
        invoice_reference,quotation_id,customer_id,status,customer_name,brand_name,customer_email,customer_phone,currency,issue_date,due_date,
        subtotal,discount,delivery_fee,tax,grand_total,amount_paid,balance_due,payment_terms,payment_instructions,customer_note,internal_note,created_at,updated_at
    ) VALUES (?,?,?,'draft',?,?,?,?,?,?,?,?,?,?,?,?,0,?,?,?,?,?,?,?)`).bind(
        reference,q.id,q.customer_id,q.customer_name,q.brand_name,q.customer_email,q.customer_phone,q.currency||'NGN',issue,due,
        Number(q.subtotal||0),Number(q.discount||0),Number(q.delivery_fee||0),Number(q.tax||0),Number(q.grand_total||0),Number(q.grand_total||0),
        q.payment_terms||'',text(env.INVOICE_PAYMENT_INSTRUCTIONS),q.notes||'',`Created from ${q.quote_reference}`,now,now
    ).run();
    const id=result.meta?.last_row_id; if(!id) throw new Error("Invoice could not be created.");
    await replaceInvoiceItems(env.DB,id,items.results||[],now);
    return jsonResponse({success:true,message:"Invoice draft created from quotation.",invoice:{invoiceReference:reference,status:"draft",grandTotal:Number(q.grand_total||0)}},201,request,env);
}


async function createAndSendInvoiceForAcceptedQuotation(env, quotation) {
    const existing = await env.DB.prepare(`
        SELECT
            invoice_reference,
            status
        FROM invoices
        WHERE
            quotation_id = ?
            AND status NOT IN ('cancelled', 'void')
        LIMIT 1
    `).bind(quotation.id).first();

    let invoiceReference = text(existing?.invoice_reference);
    let created = false;

    if (!invoiceReference) {
        const items = await env.DB.prepare(`
            SELECT
                item_order,
                description,
                details,
                quantity,
                unit_price,
                line_total
            FROM quotation_items
            WHERE quotation_id = ?
            ORDER BY item_order, id
        `).bind(quotation.id).all();

        const now = new Date().toISOString();
        invoiceReference = await generateInvoiceReference(env.DB);
        const issueDate = now.slice(0, 10);
        const dueDate = new Date(
            Date.now() + 7 * 86400000
        ).toISOString().slice(0, 10);

        const result = await env.DB.prepare(`
            INSERT INTO invoices (
                invoice_reference,
                quotation_id,
                customer_id,
                status,
                customer_name,
                brand_name,
                customer_email,
                customer_phone,
                currency,
                issue_date,
                due_date,
                subtotal,
                discount,
                delivery_fee,
                tax,
                grand_total,
                amount_paid,
                balance_due,
                payment_terms,
                payment_instructions,
                customer_note,
                internal_note,
                created_at,
                updated_at
            )
            VALUES (
                ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?,
                ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?
            )
        `).bind(
            invoiceReference,
            quotation.id,
            quotation.customer_id || null,
            quotation.customer_name,
            quotation.brand_name,
            quotation.customer_email,
            quotation.customer_phone,
            quotation.currency || "NGN",
            issueDate,
            dueDate,
            Number(quotation.subtotal || 0),
            Number(quotation.discount || 0),
            Number(quotation.delivery_fee || 0),
            Number(quotation.tax || 0),
            Number(quotation.grand_total || 0),
            Number(quotation.grand_total || 0),
            quotation.payment_terms || "",
            text(env.INVOICE_PAYMENT_INSTRUCTIONS),
            quotation.notes || "",
            `Automatically created from accepted quotation ${quotation.quote_reference}`,
            now,
            now
        ).run();

        const invoiceId = result.meta?.last_row_id;

        if (!invoiceId) {
            throw new Error("The automatic invoice could not be created.");
        }

        await replaceInvoiceItems(
            env.DB,
            invoiceId,
            items.results || [],
            now
        );

        created = true;

        await recordQuotationActivity(env.DB, {
            quotationId: quotation.id,
            activityType: "invoice_created",
            title: "Invoice created automatically",
            details:
                `${invoiceReference} was created immediately after acceptance.`,
            actor: "system",
            createdAt: now
        });
    }

    const latestInvoice = await env.DB.prepare(`
        SELECT status
        FROM invoices
        WHERE invoice_reference = ?
        LIMIT 1
    `).bind(invoiceReference).first();

    if (latestInvoice?.status === "draft") {
        const internalRequest = new Request(
            `https://internal.luxsome/admin/invoices/${encodeURIComponent(
                invoiceReference
            )}/send`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message:
                        "Thank you for accepting your Luxsome quotation. " +
                        "Your invoice is ready for payment."
                })
            }
        );

        const sendResponse = await handleAdminInvoiceSend(
            internalRequest,
            env,
            invoiceReference
        );

        const sendData = await sendResponse.json().catch(() => ({}));

        if (!sendResponse.ok) {
            throw new Error(
                text(sendData?.error) ||
                text(sendData?.message) ||
                "The invoice was created but could not be emailed."
            );
        }

        await recordQuotationActivity(env.DB, {
            quotationId: quotation.id,
            activityType: "invoice_sent",
            title: "Invoice emailed automatically",
            details:
                `${invoiceReference} was emailed to ${quotation.customer_email}.`,
            actor: "system",
            createdAt: new Date().toISOString()
        });
    }

    return {
        invoiceReference,
        created,
        sent: true
    };
}

async function handleAdminInvoiceDetail(request, env, reference) {
    const invoice = await env.DB.prepare(`
        SELECT
            i.*,
            q.quote_reference
        FROM invoices i
        LEFT JOIN quotations q ON q.id = i.quotation_id
        WHERE i.invoice_reference = ?
        LIMIT 1
    `).bind(reference).first();

    if (!invoice) {
        return jsonResponse(
            {
                success: false,
                message: "Invoice not found."
            },
            404,
            request,
            env
        );
    }

    const items = await env.DB.prepare(`
        SELECT
            id,
            item_order,
            description,
            details,
            quantity,
            unit_price,
            line_total
        FROM invoice_items
        WHERE invoice_id = ?
        ORDER BY item_order, id
    `).bind(invoice.id).all();

    const payments = await env.DB.prepare(`
        SELECT
            id,
            receipt_reference,
            receipt_token,
            amount,
            payment_date,
            payment_method,
            payment_reference,
            notes,
            recorded_by,
            receipt_sent_at,
            receipt_send_count,
            created_at
        FROM invoice_payments
        WHERE invoice_id = ?
        ORDER BY payment_date DESC, id DESC
    `).bind(invoice.id).all();

    return jsonResponse(
        {
            success: true,
            invoice: {
                ...invoice,
                items: items.results || [],
                payments: payments.results || []
            }
        },
        200,
        request,
        env
    );
}

async function handleAdminInvoiceUpdate(request, env, reference) {
    const existing=await env.DB.prepare(`SELECT * FROM invoices WHERE invoice_reference=? LIMIT 1`).bind(reference).first();
    if(!existing) return jsonResponse({success:false,message:"Invoice not found."},404,request,env);
    const body=await request.json().catch(()=>({}));
    const statuses=new Set(["draft","sent","partially_paid","paid","overdue","cancelled","void"]);
    if(body.status!==undefined && !statuses.has(text(body.status))) return jsonResponse({success:false,message:"Invalid invoice status."},422,request,env);
    const merged={customerName:body.customerName??existing.customer_name,brandName:body.brandName??existing.brand_name,customerEmail:body.customerEmail??existing.customer_email,customerPhone:body.customerPhone??existing.customer_phone,currency:body.currency??existing.currency,issueDate:body.issueDate??existing.issue_date,dueDate:body.dueDate??existing.due_date,discount:body.discount??existing.discount,deliveryFee:body.deliveryFee??existing.delivery_fee,tax:body.tax??existing.tax,paymentTerms:body.paymentTerms??existing.payment_terms,paymentInstructions:body.paymentInstructions??existing.payment_instructions,customerNote:body.customerNote??existing.customer_note,internalNote:body.internalNote??existing.internal_note,items:body.items};
    let totals={subtotal:Number(existing.subtotal||0),discount:Number(existing.discount||0),deliveryFee:Number(existing.delivery_fee||0),tax:Number(existing.tax||0),grandTotal:Number(existing.grand_total||0)};
    let data=merged;
    if(body.items!==undefined){const v=validateInvoicePayload(merged);if(v.errors.length)return jsonResponse({success:false,message:v.errors[0]},422,request,env);data=v.data;totals=calculateInvoiceTotals(data);}
    const amountPaid=Math.max(0,Number(body.amountPaid??existing.amount_paid)||0); const balance=Math.max(0,totals.grandTotal-amountPaid);
    let status=text(body.status)||existing.status;
    if(!["cancelled","void"].includes(status)){if(amountPaid>=totals.grandTotal && totals.grandTotal>0)status="paid";else if(amountPaid>0)status="partially_paid";else if(existing.due_date && new Date(existing.due_date+'T23:59:59Z')<new Date() && status!=="draft")status="overdue";}
    const now=new Date().toISOString();
    await env.DB.prepare(`UPDATE invoices SET status=?,customer_name=?,brand_name=?,customer_email=?,customer_phone=?,currency=?,issue_date=?,due_date=?,subtotal=?,discount=?,delivery_fee=?,tax=?,grand_total=?,amount_paid=?,balance_due=?,payment_terms=?,payment_instructions=?,customer_note=?,internal_note=?,updated_at=? WHERE id=?`).bind(status,data.customerName,data.brandName,data.customerEmail,data.customerPhone,data.currency,data.issueDate,data.dueDate,totals.subtotal,totals.discount,totals.deliveryFee,totals.tax,totals.grandTotal,amountPaid,balance,data.paymentTerms,data.paymentInstructions,data.customerNote,data.internalNote,now,existing.id).run();
    if(body.items!==undefined) await replaceInvoiceItems(env.DB,existing.id,data.items,now);
    return jsonResponse({success:true,message:"Invoice updated.",invoice:{invoiceReference:reference,status,grandTotal:totals.grandTotal,amountPaid,balanceDue:balance}},200,request,env);
}

function validateInvoicePayload(body){
    const errors=[]; const items=Array.isArray(body.items)?body.items.map((i,index)=>({itemOrder:index,description:text(i.description),details:text(i.details),quantity:Math.max(0,Number(i.quantity)||0),unitPrice:Math.max(0,Number(i.unitPrice??i.unit_price)||0)})):[];
    if(!text(body.customerName)&&!text(body.brandName))errors.push("Enter a customer or brand name.");
    if(!text(body.issueDate))errors.push("Select an issue date.");
    if(!items.length)errors.push("Add at least one invoice item.");
    if(items.some(i=>!i.description))errors.push("Every invoice item needs a description.");
    return {errors,data:{customerName:text(body.customerName),brandName:text(body.brandName),customerEmail:text(body.customerEmail).toLowerCase(),customerPhone:text(body.customerPhone),currency:text(body.currency)||"NGN",issueDate:text(body.issueDate),dueDate:text(body.dueDate),discount:Math.max(0,Number(body.discount)||0),deliveryFee:Math.max(0,Number(body.deliveryFee)||0),tax:Math.max(0,Number(body.tax)||0),paymentTerms:text(body.paymentTerms),paymentInstructions:text(body.paymentInstructions),customerNote:text(body.customerNote),internalNote:text(body.internalNote),items}};
}
function calculateInvoiceTotals(data){const subtotal=data.items.reduce((s,i)=>s+i.quantity*i.unitPrice,0);const grandTotal=Math.max(0,subtotal-data.discount+data.deliveryFee+data.tax);return {subtotal,discount:data.discount,deliveryFee:data.deliveryFee,tax:data.tax,grandTotal};}
async function replaceInvoiceItems(db,id,items,now){await db.prepare(`DELETE FROM invoice_items WHERE invoice_id=?`).bind(id).run();for(let index=0;index<items.length;index++){const i=items[index];const qty=Math.max(0,Number(i.quantity)||0);const unit=Math.max(0,Number(i.unitPrice??i.unit_price)||0);await db.prepare(`INSERT INTO invoice_items (invoice_id,item_order,description,details,quantity,unit_price,line_total,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)`).bind(id,index,text(i.description),text(i.details),qty,unit,qty*unit,now,now).run();}}
async function generateInvoiceReference(db){const year=new Date().getUTCFullYear();const prefix=`INV-${year}-`;const last=await db.prepare(`SELECT invoice_reference FROM invoices WHERE invoice_reference LIKE ? ORDER BY invoice_reference DESC LIMIT 1`).bind(`${prefix}%`).first();const n=last?Number(last.invoice_reference.split('-').pop())+1:1;return `${prefix}${String(n).padStart(4,'0')}`;}



async function handleAdminInvoicePaymentList(
    request,
    env,
    invoiceReference
) {
    const invoice = await getInvoiceByReference(
        env.DB,
        invoiceReference
    );

    if (!invoice) {
        return jsonResponse(
            {
                success: false,
                message: "Invoice not found."
            },
            404,
            request,
            env
        );
    }

    const result = await env.DB.prepare(`
        SELECT
            id,
            receipt_reference,
            receipt_token,
            amount,
            payment_date,
            payment_method,
            payment_reference,
            notes,
            recorded_by,
            receipt_sent_at,
            receipt_send_count,
            created_at
        FROM invoice_payments
        WHERE invoice_id = ?
        ORDER BY payment_date DESC, id DESC
    `).bind(invoice.id).all();

    return jsonResponse(
        {
            success: true,
            payments: result.results || []
        },
        200,
        request,
        env
    );
}

async function handleAdminInvoicePaymentCreate(
    request,
    env,
    invoiceReference
) {
    const invoice = await getInvoiceByReference(
        env.DB,
        invoiceReference
    );

    if (!invoice) {
        return jsonResponse(
            {
                success: false,
                message: "Invoice not found."
            },
            404,
            request,
            env
        );
    }

    if (["cancelled", "void"].includes(invoice.status)) {
        return jsonResponse(
            {
                success: false,
                message: "Payments cannot be added to this invoice."
            },
            409,
            request,
            env
        );
    }

    const body = await request.json().catch(() => ({}));
    const amount = Math.max(0, Number(body.amount) || 0);
    const paymentDate = text(body.paymentDate);
    const paymentMethod = text(body.paymentMethod);
    const paymentReference = text(body.paymentReference).slice(0, 200);
    const notes = text(body.notes).slice(0, 2000);

    if (!amount) {
        return jsonResponse(
            {
                success: false,
                message: "Enter a payment amount greater than zero."
            },
            422,
            request,
            env
        );
    }

    if (!paymentDate) {
        return jsonResponse(
            {
                success: false,
                message: "Select the payment date."
            },
            422,
            request,
            env
        );
    }

    if (!paymentMethod) {
        return jsonResponse(
            {
                success: false,
                message: "Select the payment method."
            },
            422,
            request,
            env
        );
    }

    const currentPaid = Number(invoice.amount_paid || 0);
    const grandTotal = Number(invoice.grand_total || 0);
    const newAmountPaid = currentPaid + amount;

    if (newAmountPaid > grandTotal) {
        return jsonResponse(
            {
                success: false,
                message:
                    "The payment is greater than the remaining invoice balance."
            },
            422,
            request,
            env
        );
    }

    const now = new Date().toISOString();
    const receiptReference = await generateReceiptReference(env.DB);
    const receiptToken = generatePublicToken();

    const result = await env.DB.prepare(`
        INSERT INTO invoice_payments (
            invoice_id,
            receipt_reference,
            receipt_token,
            amount,
            payment_date,
            payment_method,
            payment_reference,
            notes,
            recorded_by,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'admin', ?, ?)
    `).bind(
        invoice.id,
        receiptReference,
        receiptToken,
        amount,
        paymentDate,
        paymentMethod,
        paymentReference || null,
        notes || null,
        now,
        now
    ).run();

    const paymentId = result.meta?.last_row_id;

    if (!paymentId) {
        throw new Error("The payment could not be recorded.");
    }

    await recalculateInvoicePaymentTotals(
        env.DB,
        invoice.id,
        now
    );

    await recordInvoiceActivity(env.DB, {
        invoiceId: invoice.id,
        activityType: "payment_recorded",
        title: "Payment recorded",
        details: [
            `Amount: ${formatInvoiceMoney(amount, invoice.currency)}.`,
            `Method: ${paymentMethod}.`,
            paymentReference
                ? `Reference: ${paymentReference}.`
                : ""
        ].filter(Boolean).join(" "),
        actor: "admin",
        createdAt: now
    });

    const updatedInvoice = await getInvoiceByReference(
        env.DB,
        invoiceReference
    );

    return jsonResponse(
        {
            success: true,
            message: "Payment recorded and receipt created.",
            payment: {
                id: paymentId,
                receiptReference,
                receiptToken,
                amount,
                paymentDate,
                paymentMethod
            },
            invoice: {
                invoiceReference,
                status: updatedInvoice.status,
                amountPaid: Number(updatedInvoice.amount_paid || 0),
                balanceDue: Number(updatedInvoice.balance_due || 0)
            }
        },
        201,
        request,
        env
    );
}

async function handleAdminInvoicePaymentDelete(
    request,
    env,
    invoiceReference,
    paymentId
) {
    const invoice = await getInvoiceByReference(
        env.DB,
        invoiceReference
    );

    if (!invoice) {
        return jsonResponse(
            {
                success: false,
                message: "Invoice not found."
            },
            404,
            request,
            env
        );
    }

    const payment = await env.DB.prepare(`
        SELECT *
        FROM invoice_payments
        WHERE id = ? AND invoice_id = ?
        LIMIT 1
    `).bind(paymentId, invoice.id).first();

    if (!payment) {
        return jsonResponse(
            {
                success: false,
                message: "Payment not found."
            },
            404,
            request,
            env
        );
    }

    const now = new Date().toISOString();

    await env.DB.prepare(`
        DELETE FROM invoice_payments
        WHERE id = ? AND invoice_id = ?
    `).bind(paymentId, invoice.id).run();

    await recalculateInvoicePaymentTotals(
        env.DB,
        invoice.id,
        now
    );

    await recordInvoiceActivity(env.DB, {
        invoiceId: invoice.id,
        activityType: "payment_deleted",
        title: "Payment removed",
        details:
            `${payment.receipt_reference} for ` +
            `${formatInvoiceMoney(payment.amount, invoice.currency)} was removed.`,
        actor: "admin",
        createdAt: now
    });

    return jsonResponse(
        {
            success: true,
            message: "Payment removed and invoice balance recalculated."
        },
        200,
        request,
        env
    );
}

async function handleAdminReceiptSend(
    request,
    env,
    paymentId
) {
    const payment = await env.DB.prepare(`
        SELECT
            p.*,
            i.invoice_reference,
            i.customer_name,
            i.brand_name,
            i.customer_email,
            i.customer_phone,
            i.currency,
            i.grand_total,
            i.amount_paid,
            i.balance_due
        FROM invoice_payments p
        INNER JOIN invoices i ON i.id = p.invoice_id
        WHERE p.id = ?
        LIMIT 1
    `).bind(paymentId).first();

    if (!payment) {
        return jsonResponse(
            {
                success: false,
                message: "Payment receipt not found."
            },
            404,
            request,
            env
        );
    }

    const customerEmail = text(payment.customer_email).toLowerCase();

    if (!isValidEmail(customerEmail)) {
        return jsonResponse(
            {
                success: false,
                message:
                    "Add a valid customer email before sending the receipt."
            },
            422,
            request,
            env
        );
    }

    if (!env.RESEND_API_KEY || !env.FROM_EMAIL) {
        return jsonResponse(
            {
                success: false,
                message: "Receipt email delivery is not configured."
            },
            500,
            request,
            env
        );
    }

    const publicSiteUrl =
        text(env.PUBLIC_SITE_URL) ||
        "https://www.luxsomepackaging.com";

    const receiptUrl =
        `${publicSiteUrl.replace(/\/$/, "")}/receipt/` +
        `?token=${encodeURIComponent(payment.receipt_token)}`;

    const body = await request.json().catch(() => ({}));
    const message = text(body.message).slice(0, 2000);

    const payload = {
        from: env.FROM_EMAIL,
        to: [customerEmail],
        subject:
            `Payment receipt ${payment.receipt_reference} ` +
            `from Luxsome Packaging`,
        html: buildReceiptEmailHtml({
            payment,
            receiptUrl,
            message
        })
    };

    if (env.REPLY_TO_EMAIL) {
        payload.reply_to = env.REPLY_TO_EMAIL;
    }

    const resendResponse = await fetch(RESEND_EMAIL_ENDPOINT, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
    });

    const resendData = await safeJson(resendResponse);

    if (!resendResponse.ok) {
        return jsonResponse(
            {
                success: false,
                message: "The receipt email could not be sent.",
                error:
                    text(resendData?.message) ||
                    "Resend rejected the email request."
            },
            502,
            request,
            env
        );
    }

    const now = new Date().toISOString();

    await env.DB.prepare(`
        UPDATE invoice_payments
        SET
            receipt_sent_at = ?,
            receipt_send_count = COALESCE(receipt_send_count, 0) + 1,
            resend_email_id = ?,
            updated_at = ?
        WHERE id = ?
    `).bind(
        now,
        text(resendData?.id),
        now,
        payment.id
    ).run();

    await recordInvoiceActivity(env.DB, {
        invoiceId: payment.invoice_id,
        activityType: "receipt_sent",
        title:
            Number(payment.receipt_send_count || 0) > 0
                ? "Receipt resent"
                : "Receipt emailed",
        details:
            `${payment.receipt_reference} sent to ${customerEmail}.`,
        actor: "admin",
        createdAt: now
    });

    return jsonResponse(
        {
            success: true,
            message: "Receipt sent to the customer.",
            receipt: {
                receiptReference: payment.receipt_reference,
                sentAt: now,
                portalUrl: receiptUrl
            }
        },
        200,
        request,
        env
    );
}

async function handlePublicReceiptRequest(request, env, url) {
    const match = url.pathname.match(
        /^\/public\/receipts\/([a-f0-9]{64})$/
    );

    if (!match || request.method !== "GET") {
        return jsonResponse(
            {
                success: false,
                message: "Receipt link not found."
            },
            404,
            request,
            env
        );
    }

    const receipt = await env.DB.prepare(`
        SELECT
            p.receipt_reference,
            p.amount,
            p.payment_date,
            p.payment_method,
            p.payment_reference,
            p.notes,
            p.created_at,
            i.invoice_reference,
            i.customer_name,
            i.brand_name,
            i.currency,
            i.grand_total,
            i.amount_paid,
            i.balance_due,
            i.status
        FROM invoice_payments p
        INNER JOIN invoices i ON i.id = p.invoice_id
        WHERE p.receipt_token = ?
        LIMIT 1
    `).bind(match[1]).first();

    if (!receipt) {
        return jsonResponse(
            {
                success: false,
                message: "This receipt link is invalid."
            },
            404,
            request,
            env
        );
    }

    return jsonResponse(
        {
            success: true,
            receipt
        },
        200,
        request,
        env
    );
}

async function getInvoiceByReference(
    db,
    invoiceReference
) {
    return await db.prepare(`
        SELECT *
        FROM invoices
        WHERE invoice_reference = ?
        LIMIT 1
    `).bind(invoiceReference).first();
}

async function recalculateInvoicePaymentTotals(
    db,
    invoiceId,
    now
) {
    const invoice = await db.prepare(`
        SELECT
            id,
            grand_total,
            due_date,
            status
        FROM invoices
        WHERE id = ?
        LIMIT 1
    `).bind(invoiceId).first();

    if (!invoice) {
        throw new Error("Invoice not found during payment recalculation.");
    }

    const total = await db.prepare(`
        SELECT COALESCE(SUM(amount), 0) AS amount_paid
        FROM invoice_payments
        WHERE invoice_id = ?
    `).bind(invoiceId).first();

    const amountPaid = Number(total?.amount_paid || 0);
    const grandTotal = Number(invoice.grand_total || 0);
    const balanceDue = Math.max(0, grandTotal - amountPaid);

    let status = invoice.status;

    if (!["cancelled", "void"].includes(status)) {
        if (grandTotal > 0 && balanceDue <= 0) {
            status = "paid";
        } else if (amountPaid > 0) {
            status = "partially_paid";
        } else if (
            invoice.due_date &&
            new Date(`${invoice.due_date}T23:59:59Z`) < new Date() &&
            status !== "draft"
        ) {
            status = "overdue";
        } else if (status !== "draft") {
            status = "sent";
        }
    }

    await db.prepare(`
        UPDATE invoices
        SET
            amount_paid = ?,
            balance_due = ?,
            status = ?,
            payment_confirmation_status = NULL,
            updated_at = ?
        WHERE id = ?
    `).bind(
        amountPaid,
        balanceDue,
        status,
        now,
        invoiceId
    ).run();
}

async function generateReceiptReference(db) {
    const year = new Date().getUTCFullYear();
    const prefix = `RCT-${year}-`;

    const last = await db.prepare(`
        SELECT receipt_reference
        FROM invoice_payments
        WHERE receipt_reference LIKE ?
        ORDER BY receipt_reference DESC
        LIMIT 1
    `).bind(`${prefix}%`).first();

    const nextNumber = last
        ? Number(last.receipt_reference.split("-").pop()) + 1
        : 1;

    return `${prefix}${String(nextNumber).padStart(4, "0")}`;
}

function buildReceiptEmailHtml({
    payment,
    receiptUrl,
    message
}) {
    const customer =
        text(payment.brand_name) ||
        text(payment.customer_name) ||
        "Valued customer";

    return `
<!doctype html>
<html>
<body style="margin:0;background:#f8f4ef;color:#2e1c15;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr>
<td align="center" style="padding:32px 14px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#fff;border:1px solid #e4d8d0;">
<tr>
<td style="padding:36px 38px;">
<p style="margin:0 0 8px;font:600 11px Arial,sans-serif;letter-spacing:2px;color:#8d654d;">
LUXSOME PACKAGING
</p>
<h1 style="margin:0;font:400 34px Georgia,serif;">
Payment received
</h1>
<p style="margin:14px 0 0;font:400 15px/1.7 Arial,sans-serif;color:#6d574b;">
Hello ${escapeHtml(customer)}, thank you. We have recorded your payment.
</p>
${message ? `
<div style="margin:22px 0;padding:16px 18px;background:#f8f4ef;font:400 14px/1.7 Arial,sans-serif;">
${escapeHtml(message)}
</div>` : ""}
<div style="margin:26px 0;padding:24px;background:#2e1c15;color:#fff;text-align:center;">
<div style="font:600 10px Arial,sans-serif;letter-spacing:1.5px;color:#d8c4b7;">
AMOUNT RECEIVED
</div>
<div style="margin-top:8px;font:400 34px Georgia,serif;">
${escapeHtml(formatInvoiceMoney(payment.amount, payment.currency))}
</div>
</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font:400 13px/1.6 Arial,sans-serif;">
<tr>
<td style="padding:9px 0;border-bottom:1px solid #eadfd7;">Receipt</td>
<td align="right" style="padding:9px 0;border-bottom:1px solid #eadfd7;font-weight:700;">
${escapeHtml(payment.receipt_reference)}
</td>
</tr>
<tr>
<td style="padding:9px 0;border-bottom:1px solid #eadfd7;">Invoice</td>
<td align="right" style="padding:9px 0;border-bottom:1px solid #eadfd7;font-weight:700;">
${escapeHtml(payment.invoice_reference)}
</td>
</tr>
<tr>
<td style="padding:9px 0;border-bottom:1px solid #eadfd7;">Payment date</td>
<td align="right" style="padding:9px 0;border-bottom:1px solid #eadfd7;">
${escapeHtml(payment.payment_date)}
</td>
</tr>
<tr>
<td style="padding:9px 0;border-bottom:1px solid #eadfd7;">Payment method</td>
<td align="right" style="padding:9px 0;border-bottom:1px solid #eadfd7;">
${escapeHtml(payment.payment_method)}
</td>
</tr>
<tr>
<td style="padding:9px 0;">Remaining balance</td>
<td align="right" style="padding:9px 0;font-weight:700;">
${escapeHtml(formatInvoiceMoney(payment.balance_due, payment.currency))}
</td>
</tr>
</table>
<div style="margin:28px 0 4px;text-align:center;">
<a href="${escapeHtml(receiptUrl)}" style="display:inline-block;padding:15px 24px;background:#2e1c15;color:#fff;text-decoration:none;font:600 12px Arial,sans-serif;letter-spacing:1px;">
VIEW RECEIPT
</a>
</div>
</td>
</tr>
<tr>
<td style="padding:22px 38px;border-top:1px solid #e4d8d0;text-align:center;font:400 11px/1.7 Arial,sans-serif;color:#806b60;">
Luxsome Packaging · Lagos, Nigeria<br>
hello@luxsomepackaging.com
</td>
</tr>
</table>
</td>
</tr>
</table>
</body>
</html>`;
}

async function handleAdminInvoiceSend(request, env, invoiceReference) {
    const invoice = await env.DB.prepare(`
        SELECT *
        FROM invoices
        WHERE invoice_reference = ?
        LIMIT 1
    `).bind(invoiceReference).first();

    if (!invoice) {
        return jsonResponse(
            { success: false, message: "Invoice not found." },
            404,
            request,
            env
        );
    }

    const customerEmail = text(invoice.customer_email).toLowerCase();

    if (!isValidEmail(customerEmail)) {
        return jsonResponse(
            {
                success: false,
                message: "Please add a valid customer email before sending."
            },
            422,
            request,
            env
        );
    }

    if (!env.RESEND_API_KEY || !env.FROM_EMAIL) {
        return jsonResponse(
            {
                success: false,
                message: "Invoice email delivery is not configured."
            },
            500,
            request,
            env
        );
    }

    let publicToken = text(invoice.public_token);

    if (!publicToken) {
        publicToken = generatePublicToken();

        await env.DB.prepare(`
            UPDATE invoices
            SET public_token = ?, updated_at = ?
            WHERE id = ?
        `).bind(publicToken, new Date().toISOString(), invoice.id).run();
    }

    const itemsResult = await env.DB.prepare(`
        SELECT description, details, quantity, unit_price, line_total
        FROM invoice_items
        WHERE invoice_id = ?
        ORDER BY item_order ASC, id ASC
    `).bind(invoice.id).all();

    const items = itemsResult.results || [];
    const body = await request.json().catch(() => ({}));
    const optionalMessage = text(body.message).slice(0, 2000);
    const publicSiteUrl =
        text(env.PUBLIC_SITE_URL) || "https://www.luxsomepackaging.com";
    const invoiceUrl =
        `${publicSiteUrl.replace(/\/$/, "")}/invoice/?token=${encodeURIComponent(publicToken)}`;

    const html = buildInvoiceEmailHtml({
        invoice,
        items,
        invoiceUrl,
        optionalMessage
    });

    const emailPayload = {
        from: env.FROM_EMAIL,
        to: [customerEmail],
        subject: `Luxsome Packaging invoice ${invoice.invoice_reference}`,
        html
    };

    if (env.REPLY_TO_EMAIL) {
        emailPayload.reply_to = env.REPLY_TO_EMAIL;
    }

    const resendResponse = await fetch(RESEND_EMAIL_ENDPOINT, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(emailPayload)
    });

    const resendData = await safeJson(resendResponse);

    if (!resendResponse.ok) {
        return jsonResponse(
            {
                success: false,
                message: "The invoice email could not be sent.",
                error:
                    text(resendData?.message) ||
                    "Resend rejected the email request."
            },
            502,
            request,
            env
        );
    }

    const now = new Date().toISOString();

    await env.DB.prepare(`
        UPDATE invoices
        SET
            status = CASE WHEN status = 'draft' THEN 'sent' ELSE status END,
            sent_at = ?,
            send_count = COALESCE(send_count, 0) + 1,
            resend_email_id = ?,
            updated_at = ?
        WHERE id = ?
    `).bind(now, text(resendData?.id), now, invoice.id).run();

    await recordInvoiceActivity(env.DB, {
        invoiceId: invoice.id,
        activityType: "sent",
        title: Number(invoice.send_count || 0) > 0
            ? "Invoice resent"
            : "Invoice emailed",
        details: `Sent to ${customerEmail}.`,
        actor: "admin",
        createdAt: now
    });

    return jsonResponse(
        {
            success: true,
            message: "Invoice sent to the customer.",
            invoice: {
                invoiceReference,
                status: invoice.status === "draft" ? "sent" : invoice.status,
                sentAt: now,
                portalUrl: invoiceUrl,
                emailId: text(resendData?.id)
            }
        },
        200,
        request,
        env
    );
}

async function handleAdminInvoiceActivity(request, env, invoiceReference) {
    const invoice = await env.DB.prepare(`
        SELECT id
        FROM invoices
        WHERE invoice_reference = ?
        LIMIT 1
    `).bind(invoiceReference).first();

    if (!invoice) {
        return jsonResponse(
            { success: false, message: "Invoice not found." },
            404,
            request,
            env
        );
    }

    const result = await env.DB.prepare(`
        SELECT activity_type, title, details, actor, created_at
        FROM invoice_activity
        WHERE invoice_id = ?
        ORDER BY created_at DESC, id DESC
    `).bind(invoice.id).all();

    return jsonResponse(
        { success: true, activity: result.results || [] },
        200,
        request,
        env
    );
}

async function handleAdminInvoicePaymentSlip(
    request,
    env,
    invoiceReference
) {
    if (!env.PAYMENT_SLIPS) {
        return jsonResponse(
            { success: false, message: "Payment-slip storage is not configured." },
            500,
            request,
            env
        );
    }

    const invoice = await env.DB.prepare(`
        SELECT
            payment_confirmation_file_key,
            payment_confirmation_file_name,
            payment_confirmation_file_type
        FROM invoices
        WHERE invoice_reference = ?
        LIMIT 1
    `).bind(invoiceReference).first();

    if (!invoice?.payment_confirmation_file_key) {
        return jsonResponse(
            { success: false, message: "No payment slip is attached to this invoice." },
            404,
            request,
            env
        );
    }

    const object = await env.PAYMENT_SLIPS.get(
        invoice.payment_confirmation_file_key
    );

    if (!object) {
        return jsonResponse(
            { success: false, message: "The payment-slip file could not be found." },
            404,
            request,
            env
        );
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set(
        "Content-Type",
        invoice.payment_confirmation_file_type ||
            headers.get("Content-Type") ||
            "application/octet-stream"
    );
    headers.set(
        "Content-Disposition",
        `inline; filename="${safeDownloadName(
            invoice.payment_confirmation_file_name || "payment-slip"
        )}"`
    );
    headers.set("Cache-Control", "private, no-store");
    headers.set("X-Content-Type-Options", "nosniff");

    const origin = request.headers.get("Origin");

    if (isAllowedOrigin(origin, env)) {
        for (const [key, value] of Object.entries(corsHeaders(origin))) {
            headers.set(key, value);
        }
    }

    return new Response(object.body, {
        status: 200,
        headers
    });
}

function getPaymentSlipExtension(contentType) {
    return {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "application/pdf": "pdf"
    }[contentType] || "bin";
}

function safeDownloadName(value) {
    const cleaned = text(value)
        .replace(/[\\/\u0000-\u001f\u007f"]/g, "-")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 180);

    return cleaned || "payment-slip";
}

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    const chunkSize = 0x8000;

    for (let index = 0; index < bytes.length; index += chunkSize) {
        binary += String.fromCharCode(
            ...bytes.subarray(index, index + chunkSize)
        );
    }

    return btoa(binary);
}

async function handlePublicInvoiceRequest(request, env, url) {
    const match = url.pathname.match(
        /^\/public\/invoices\/([a-f0-9]{64})(?:\/([a-z-]+))?$/
    );

    if (!match) {
        return jsonResponse(
            { success: false, message: "Invoice link not found." },
            404,
            request,
            env
        );
    }

    const token = match[1];
    const action = match[2] || "";

    if (request.method === "GET" && !action) {
        return await handlePublicInvoiceView(request, env, token);
    }

    if (request.method === "POST" && action === "confirm-payment") {
        return await handlePublicInvoicePaymentConfirmation(
            request,
            env,
            token
        );
    }

    return jsonResponse(
        { success: false, message: "Invoice action not found." },
        404,
        request,
        env
    );
}

async function handlePublicInvoiceView(request, env, publicToken) {
    const invoice = await env.DB.prepare(`
        SELECT
            id,
            invoice_reference,
            status,
            customer_name,
            brand_name,
            currency,
            issue_date,
            due_date,
            subtotal,
            discount,
            delivery_fee,
            tax,
            grand_total,
            amount_paid,
            balance_due,
            payment_terms,
            payment_instructions,
            customer_note,
            sent_at,
            viewed_at,
            view_count,
            payment_confirmation_status,
            payment_confirmation_amount,
            payment_confirmation_reference,
            payment_confirmation_note,
            payment_confirmation_file_name,
            payment_confirmation_file_type,
            payment_confirmation_file_size,
            payment_confirmation_at
        FROM invoices
        WHERE public_token = ?
        LIMIT 1
    `).bind(publicToken).first();

    if (!invoice || ["cancelled", "void"].includes(invoice.status)) {
        return jsonResponse(
            {
                success: false,
                message: "This invoice link is invalid or no longer available."
            },
            404,
            request,
            env
        );
    }

    const itemsResult = await env.DB.prepare(`
        SELECT description, details, quantity, unit_price, line_total
        FROM invoice_items
        WHERE invoice_id = ?
        ORDER BY item_order ASC, id ASC
    `).bind(invoice.id).all();

    const now = new Date().toISOString();
    const firstView = !invoice.viewed_at;

    await env.DB.prepare(`
        UPDATE invoices
        SET
            viewed_at = COALESCE(viewed_at, ?),
            view_count = COALESCE(view_count, 0) + 1,
            updated_at = ?
        WHERE id = ?
    `).bind(now, now, invoice.id).run();

    if (firstView) {
        await recordInvoiceActivity(env.DB, {
            invoiceId: invoice.id,
            activityType: "viewed",
            title: "Customer viewed invoice",
            details: null,
            actor: "customer",
            createdAt: now
        });
    }

    return jsonResponse(
        {
            success: true,
            invoice: {
                ...invoice,
                view_count: Number(invoice.view_count || 0) + 1,
                items: itemsResult.results || []
            }
        },
        200,
        request,
        env
    );
}

async function handlePublicInvoicePaymentConfirmation(
    request,
    env,
    publicToken
) {
    const invoice = await env.DB.prepare(`
        SELECT *
        FROM invoices
        WHERE public_token = ?
        LIMIT 1
    `).bind(publicToken).first();

    if (!invoice || ["cancelled", "void"].includes(invoice.status)) {
        return jsonResponse(
            {
                success: false,
                message: "This invoice link is invalid or no longer available."
            },
            404,
            request,
            env
        );
    }

    if (invoice.status === "paid") {
        return jsonResponse(
            {
                success: false,
                message: "This invoice is already marked as paid."
            },
            409,
            request,
            env
        );
    }

    if (!env.PAYMENT_SLIPS) {
        return jsonResponse(
            {
                success: false,
                message: "Payment-slip storage is not configured."
            },
            500,
            request,
            env
        );
    }

    const contentType = request.headers.get("Content-Type") || "";

    if (!contentType.toLowerCase().includes("multipart/form-data")) {
        return jsonResponse(
            {
                success: false,
                message: "Submit the payment information with a payment-slip file."
            },
            415,
            request,
            env
        );
    }

    const formData = await request.formData().catch(() => null);

    if (!formData) {
        return jsonResponse(
            {
                success: false,
                message: "The payment form could not be read."
            },
            400,
            request,
            env
        );
    }

    const amount = Math.max(0, Number(formData.get("amount")) || 0);
    const reference = text(formData.get("reference")).slice(0, 200);
    const note = text(formData.get("note")).slice(0, 2000);
    const slip = formData.get("paymentSlip");

    if (!amount) {
        return jsonResponse(
            {
                success: false,
                message: "Enter the amount you paid."
            },
            422,
            request,
            env
        );
    }

    if (!(slip instanceof File) || !slip.size) {
        return jsonResponse(
            {
                success: false,
                message: "Attach your payment slip."
            },
            422,
            request,
            env
        );
    }

    const allowedTypes = new Set([
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf"
    ]);
    const maximumFileSize = 5 * 1024 * 1024;

    if (!allowedTypes.has(slip.type)) {
        return jsonResponse(
            {
                success: false,
                message: "Upload a JPG, PNG, WEBP or PDF payment slip."
            },
            422,
            request,
            env
        );
    }

    if (slip.size > maximumFileSize) {
        return jsonResponse(
            {
                success: false,
                message: "The payment slip must not exceed 5 MB."
            },
            422,
            request,
            env
        );
    }

    const now = new Date().toISOString();
    const extension = getPaymentSlipExtension(slip.type);
    const randomId = crypto.randomUUID();
    const objectKey =
        `payment-slips/${invoice.invoice_reference}/` +
        `${Date.now()}-${randomId}.${extension}`;

    await env.PAYMENT_SLIPS.put(objectKey, slip.stream(), {
        httpMetadata: {
            contentType: slip.type,
            contentDisposition:
                `inline; filename="${safeDownloadName(slip.name)}"`
        },
        customMetadata: {
            invoiceReference: invoice.invoice_reference,
            submittedAt: now
        }
    });

    try {
        await env.DB.prepare(`
            UPDATE invoices
            SET
                payment_confirmation_status = 'submitted',
                payment_confirmation_amount = ?,
                payment_confirmation_reference = ?,
                payment_confirmation_note = ?,
                payment_confirmation_file_key = ?,
                payment_confirmation_file_name = ?,
                payment_confirmation_file_type = ?,
                payment_confirmation_file_size = ?,
                payment_confirmation_at = ?,
                updated_at = ?
            WHERE id = ?
        `).bind(
            amount,
            reference || null,
            note || null,
            objectKey,
            safeDownloadName(slip.name),
            slip.type,
            slip.size,
            now,
            now,
            invoice.id
        ).run();
    } catch (error) {
        await env.PAYMENT_SLIPS.delete(objectKey).catch(() => {});
        throw error;
    }

    if (
        invoice.payment_confirmation_file_key &&
        invoice.payment_confirmation_file_key !== objectKey
    ) {
        await env.PAYMENT_SLIPS
            .delete(invoice.payment_confirmation_file_key)
            .catch(() => {});
    }

    await recordInvoiceActivity(env.DB, {
        invoiceId: invoice.id,
        activityType: "payment_confirmation",
        title: "Customer reported a payment",
        details: [
            `Amount: ${formatInvoiceMoney(amount, invoice.currency)}.`,
            reference ? `Reference: ${reference}.` : "",
            note ? `Note: ${note}` : "",
            `Payment slip attached: ${safeDownloadName(slip.name)}.`
        ].filter(Boolean).join(" "),
        actor: "customer",
        createdAt: now
    });

    await sendInvoicePaymentNotification(env, {
        invoice,
        amount,
        reference,
        note,
        now,
        slip
    });

    return jsonResponse(
        {
            success: true,
            message:
                "Your payment information and payment slip have been sent to Luxsome Packaging for verification.",
            confirmation: {
                status: "submitted",
                amount,
                fileName: safeDownloadName(slip.name),
                submittedAt: now
            }
        },
        200,
        request,
        env
    );
}

async function sendInvoicePaymentNotification(
    env,
    { invoice, amount, reference, note, now, slip }
) {
    if (!env.RESEND_API_KEY || !env.FROM_EMAIL || !env.INTERNAL_EMAIL) {
        return;
    }

    const payload = {
        from: env.FROM_EMAIL,
        to: [env.INTERNAL_EMAIL],
        subject: `Payment reported: ${invoice.invoice_reference}`,
        html: `
            <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#2e1c15;">
                <h1 style="font-family:Georgia,serif;">Customer reported a payment</h1>
                <p><strong>Invoice:</strong> ${escapeHtml(invoice.invoice_reference)}</p>
                <p><strong>Customer:</strong> ${escapeHtml(
                    text(invoice.brand_name) ||
                    text(invoice.customer_name) ||
                    "Customer"
                )}</p>
                <p><strong>Amount reported:</strong> ${escapeHtml(
                    formatInvoiceMoney(amount, invoice.currency)
                )}</p>
                <p><strong>Payment reference:</strong> ${escapeHtml(
                    reference || "Not supplied"
                )}</p>
                <p><strong>Submitted:</strong> ${escapeHtml(now)}</p>
                ${
                    note
                        ? `<p><strong>Note:</strong><br>${escapeHtml(note)}</p>`
                        : ""
                }
                <p style="margin-top:24px;">Verify the payment before updating the invoice balance.</p>
            </div>
        `
    }; 

    if (slip instanceof File && slip.size) {
        const attachmentBuffer = await slip.arrayBuffer();
        payload.attachments = [
            {
                filename: safeDownloadName(slip.name),
                content: arrayBufferToBase64(attachmentBuffer)
            }
        ];
    }

    if (env.REPLY_TO_EMAIL) {
        payload.reply_to = env.REPLY_TO_EMAIL;
    }

    try {
        const response = await fetch(RESEND_EMAIL_ENDPOINT, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${env.RESEND_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error(
                "Invoice payment notification failed",
                await safeJson(response)
            );
        }
    } catch (error) {
        console.error("Invoice payment notification error", error);
    }
}

async function recordInvoiceActivity(
    db,
    {
        invoiceId,
        activityType,
        title,
        details = null,
        actor = "system",
        createdAt = new Date().toISOString()
    }
) {
    await db.prepare(`
        INSERT INTO invoice_activity (
            invoice_id,
            activity_type,
            title,
            details,
            actor,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
        invoiceId,
        activityType,
        title,
        details,
        actor,
        createdAt
    ).run();
}

function formatInvoiceMoney(value, currency = "NGN") {
    const amount = Number(value) || 0;

    try {
        return new Intl.NumberFormat("en-NG", {
            style: "currency",
            currency: text(currency) || "NGN",
            maximumFractionDigits: 0
        }).format(amount);
    } catch {
        return `₦${amount.toLocaleString("en-NG")}`;
    }
}

function buildInvoiceEmailHtml({
    invoice,
    items,
    invoiceUrl,
    optionalMessage
}) {
    const customer =
        text(invoice.brand_name) ||
        text(invoice.customer_name) ||
        "Valued customer";

    const itemRows = items.map((item) => `
        <tr>
            <td style="padding:13px 8px;border-bottom:1px solid #eadfd7;">
                <strong>${escapeHtml(text(item.description))}</strong>
                ${
                    text(item.details)
                        ? `<div style="margin-top:4px;color:#806b60;font-size:12px;">${escapeHtml(text(item.details))}</div>`
                        : ""
                }
            </td>
            <td style="padding:13px 8px;border-bottom:1px solid #eadfd7;text-align:center;">
                ${escapeHtml(String(item.quantity))}
            </td>
            <td style="padding:13px 8px;border-bottom:1px solid #eadfd7;text-align:right;">
                ${escapeHtml(formatInvoiceMoney(item.unit_price, invoice.currency))}
            </td>
            <td style="padding:13px 8px;border-bottom:1px solid #eadfd7;text-align:right;">
                ${escapeHtml(formatInvoiceMoney(item.line_total, invoice.currency))}
            </td>
        </tr>
    `).join("");

    return `
<!doctype html>
<html>
<body style="margin:0;background:#f8f4ef;color:#2e1c15;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8f4ef;">
<tr><td align="center" style="padding:32px 14px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border:1px solid #e4d8d0;">
<tr><td style="padding:34px 38px 20px;">
<p style="margin:0 0 7px;font:600 11px Arial,sans-serif;letter-spacing:2.2px;color:#8d654d;">LUXSOME PACKAGING</p>
<h1 style="margin:0;font:400 34px Georgia,serif;">Invoice ${escapeHtml(invoice.invoice_reference)}</h1>
<p style="margin:14px 0 0;font:400 15px/1.7 Arial,sans-serif;color:#6d574b;">Hello ${escapeHtml(customer)}, your invoice is ready.</p>
${optionalMessage ? `<div style="margin:22px 0;padding:16px 18px;background:#f8f4ef;font:400 14px/1.7 Arial,sans-serif;">${escapeHtml(optionalMessage)}</div>` : ""}
</td></tr>
<tr><td style="padding:0 38px 28px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0">
<tr>
<td style="padding:18px;background:#2e1c15;color:#fff;">
<div style="font:600 10px Arial,sans-serif;letter-spacing:1.5px;color:#d8c4b7;">AMOUNT DUE</div>
<div style="margin-top:7px;font:400 30px Georgia,serif;">${escapeHtml(formatInvoiceMoney(invoice.balance_due, invoice.currency))}</div>
</td>
<td style="padding:18px;border:1px solid #e4d8d0;">
<div style="font:600 10px Arial,sans-serif;letter-spacing:1.5px;color:#8d654d;">DUE DATE</div>
<div style="margin-top:7px;font:600 15px Arial,sans-serif;">${escapeHtml(text(invoice.due_date) || "On receipt")}</div>
</td>
</tr>
</table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;border-collapse:collapse;font:400 13px Arial,sans-serif;">
<thead><tr style="background:#f3ece7;"><th align="left" style="padding:11px 8px;">Description</th><th style="padding:11px 8px;">Qty</th><th align="right" style="padding:11px 8px;">Unit price</th><th align="right" style="padding:11px 8px;">Total</th></tr></thead>
<tbody>${itemRows}</tbody>
</table>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:20px;font:400 13px Arial,sans-serif;">
<tr>
<td align="right" style="padding:5px;">Subtotal</td>
<td align="right" width="150" style="padding:5px;font-weight:700;">${escapeHtml(formatInvoiceMoney(invoice.subtotal, invoice.currency))}</td>
</tr>
<tr>
<td align="right" style="padding:5px;">Discount</td>
<td align="right" style="padding:5px;font-weight:700;">− ${escapeHtml(formatInvoiceMoney(invoice.discount, invoice.currency))}</td>
</tr>
<tr>
<td align="right" style="padding:5px;">Delivery fee</td>
<td align="right" style="padding:5px;font-weight:700;">${escapeHtml(formatInvoiceMoney(invoice.delivery_fee, invoice.currency))}</td>
</tr>
<tr>
<td align="right" style="padding:5px;">VAT</td>
<td align="right" style="padding:5px;font-weight:700;">${escapeHtml(formatInvoiceMoney(invoice.tax, invoice.currency))}</td>
</tr>
<tr>
<td align="right" style="padding:9px 5px;border-top:1px solid #eadfd7;">Invoice total</td>
<td align="right" style="padding:9px 5px;border-top:1px solid #eadfd7;font-weight:700;">${escapeHtml(formatInvoiceMoney(invoice.grand_total, invoice.currency))}</td>
</tr>
<tr>
<td align="right" style="padding:5px;">Paid</td>
<td align="right" style="padding:5px;font-weight:700;">${escapeHtml(formatInvoiceMoney(invoice.amount_paid, invoice.currency))}</td>
</tr>
<tr>
<td align="right" style="padding:8px 5px;font-size:15px;">Balance due</td>
<td align="right" style="padding:8px 5px;font-size:17px;font-weight:700;">${escapeHtml(formatInvoiceMoney(invoice.balance_due, invoice.currency))}</td>
</tr>
</table>
<div style="margin:28px 0;text-align:center;">
<a href="${escapeHtml(invoiceUrl)}" style="display:inline-block;padding:15px 24px;background:#881010;color:#fff;text-decoration:none;font:600 12px Arial,sans-serif;letter-spacing:1px; border-radius:8px">VIEW INVOICE</a>
</div>
${text(invoice.payment_instructions) ? `<div style="padding:18px;background:#f8f4ef;font:400 13px/1.7 Arial,sans-serif;"><strong>Payment instructions</strong><br>${escapeHtml(text(invoice.payment_instructions))}</div>` : ""}
</td></tr>
<tr><td style="padding:22px 38px;border-top:1px solid #e4d8d0;text-align:center;font:400 11px/1.7 Arial,sans-serif;color:#806b60;">Luxsome Packaging · Lagos, Nigeria<br>hello@luxsomepackaging.com</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

async function handleAdminQuotationList(request, env, url) {
    const allowedStatuses = new Set([
        "draft",
        "sent",
        "accepted",
        "needs_revision",
        "declined",
        "expired",
        "cancelled"
    ]);

    const requestedStatus = text(url.searchParams.get("status"));
    const search = text(url.searchParams.get("search")).slice(0, 100);
    const limit = Math.min(
        Math.max(Number(url.searchParams.get("limit")) || 25, 1),
        100
    );
    const offset = Math.max(
        Number(url.searchParams.get("offset")) || 0,
        0
    );

    const where = [];
    const bindings = [];

    if (requestedStatus === "needs_revision") {
        where.push("q.response_type = 'needs_revision'");
    } else if (allowedStatuses.has(requestedStatus)) {
        where.push("q.status = ?");
        bindings.push(requestedStatus);
    }

    if (search) {
        where.push(`(
            q.quote_reference LIKE ? OR
            q.submission_reference LIKE ? OR
            q.customer_name LIKE ? OR
            q.brand_name LIKE ? OR
            q.customer_email LIKE ?
        )`);

        const term = `%${search}%`;
        bindings.push(term, term, term, term, term);
    }

    const whereSql = where.length
        ? `WHERE ${where.join(" AND ")}`
        : "";

    const countResult = await env.DB.prepare(`
        SELECT COUNT(*) AS total
        FROM quotations q
        ${whereSql}
    `).bind(...bindings).first();

    const rows = await env.DB.prepare(`
        SELECT
            q.id,
            q.quote_reference,
            q.submission_reference,
            q.status,
            q.response_type,
            q.customer_name,
            q.brand_name,
            q.customer_email,
            q.currency,
            q.subtotal,
            q.discount,
            q.delivery_fee,
            q.tax,
            q.grand_total,
            q.issue_date,
            q.expiry_date,
            q.sent_at,
            q.send_count,
            q.created_at,
            q.updated_at,
            COUNT(qi.id) AS item_count
        FROM quotations q
        LEFT JOIN quotation_items qi
            ON qi.quotation_id = q.id
        ${whereSql}
        GROUP BY q.id
        ORDER BY q.created_at DESC
        LIMIT ? OFFSET ?
    `).bind(...bindings, limit, offset).all();

    return jsonResponse(
        {
            success: true,
            quotations: (rows.results || []).map((quotation) => ({
                ...quotation,
                status:
                    quotation.response_type === "needs_revision"
                        ? "needs_revision"
                        : quotation.status
            })),
            pagination: {
                total: Number(countResult?.total || 0),
                limit,
                offset
            }
        },
        200,
        request,
        env
    );
}

async function handleAdminQuotationCreate(request, env) {
    const body = await request.json().catch(() => ({}));
    const validation = validateQuotationPayload(body);

    if (validation.errors.length) {
        return jsonResponse(
            {
                success: false,
                message: validation.errors[0],
                errors: validation.errors.map((message) => ({ message }))
            },
            422,
            request,
            env
        );
    }

    const data = validation.data;
    const now = new Date().toISOString();
    const quoteReference = await generateQuoteReference(env.DB);

    let submission = null;

    if (data.submissionReference) {
        submission = await env.DB.prepare(`
            SELECT
                reference,
                customer_name,
                brand_name,
                email,
                phone
            FROM submissions
            WHERE reference = ?
            LIMIT 1
        `).bind(data.submissionReference).first();

        if (!submission) {
            return jsonResponse(
                {
                    success: false,
                    message: "The selected project or enquiry was not found."
                },
                404,
                request,
                env
            );
        }
    }

    const customerName =
        data.customerName ||
        text(submission?.customer_name);

    const brandName =
        data.brandName ||
        text(submission?.brand_name);

    const customerEmail =
        data.customerEmail ||
        text(submission?.email).toLowerCase();

    const customerPhone =
        data.customerPhone ||
        text(submission?.phone);

    const customerId = await upsertQuotationCustomer(env.DB, {
        customerName,
        brandName,
        email: customerEmail,
        phone: customerPhone,
        now
    });

    const totals = calculateQuotationTotals(data);

    const quotationResult = await env.DB.prepare(`
        INSERT INTO quotations (
            quote_reference,
            submission_reference,
            customer_id,
            status,
            customer_name,
            brand_name,
            customer_email,
            customer_phone,
            currency,
            issue_date,
            expiry_date,
            production_timeline,
            payment_terms,
            notes,
            subtotal,
            discount,
            delivery_fee,
            tax,
            grand_total,
            created_at,
            updated_at
        )
        VALUES (
            ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
            ?, ?, ?, ?, ?, ?, ?
        )
    `).bind(
        quoteReference,
        data.submissionReference,
        customerId,
        customerName,
        brandName,
        customerEmail,
        customerPhone,
        data.currency,
        data.issueDate,
        data.expiryDate,
        data.productionTimeline,
        data.paymentTerms,
        data.notes,
        totals.subtotal,
        totals.discount,
        totals.deliveryFee,
        totals.tax,
        totals.grandTotal,
        now,
        now
    ).run();

    const quotationId = quotationResult.meta?.last_row_id;

    if (!quotationId) {
        throw new Error("Quotation record could not be created.");
    }

    await replaceQuotationItems(
        env.DB,
        quotationId,
        data.items,
        now
    );

    if (data.submissionReference) {
        await env.DB.prepare(`
            UPDATE submissions
            SET status = 'quoted', updated_at = ?
            WHERE reference = ?
        `).bind(now, data.submissionReference).run();
    }

    return jsonResponse(
        {
            success: true,
            message: "Quotation draft created.",
            quotation: {
                quoteReference,
                status: "draft",
                grandTotal: totals.grandTotal
            }
        },
        201,
        request,
        env
    );
}

async function handleAdminQuotationDetail(
    request,
    env,
    quoteReference
) {
    const quotation = await env.DB.prepare(`
        SELECT *
        FROM quotations
        WHERE quote_reference = ?
        LIMIT 1
    `).bind(quoteReference).first();

    if (!quotation) {
        return jsonResponse(
            {
                success: false,
                message: "Quotation not found."
            },
            404,
            request,
            env
        );
    }

    const items = await env.DB.prepare(`
        SELECT
            id,
            item_order,
            description,
            details,
            quantity,
            unit_price,
            line_total
        FROM quotation_items
        WHERE quotation_id = ?
        ORDER BY item_order ASC, id ASC
    `).bind(quotation.id).all();

    const activity = await env.DB.prepare(`
        SELECT
            id,
            activity_type,
            title,
            details,
            actor,
            created_at
        FROM quotation_activity
        WHERE quotation_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT 100
    `).bind(quotation.id).all();

    const linkedInvoice = await env.DB.prepare(`
        SELECT
            invoice_reference,
            status
        FROM invoices
        WHERE
            quotation_id = ?
            AND status NOT IN ('cancelled', 'void')
        ORDER BY created_at DESC
        LIMIT 1
    `).bind(quotation.id).first();

    return jsonResponse(
        {
            success: true,
            quotation: {
                ...quotation,
                status:
                    quotation.response_type === "needs_revision"
                        ? "needs_revision"
                        : quotation.status,
                items: items.results || [],
                activity: activity.results || [],
                invoiceReference:
                    linkedInvoice?.invoice_reference || null,
                invoiceStatus:
                    linkedInvoice?.status || null
            }
        },
        200,
        request,
        env
    );
}

async function handleAdminQuotationUpdate(
    request,
    env,
    quoteReference
) {
    const existing = await env.DB.prepare(`
        SELECT *
        FROM quotations
        WHERE quote_reference = ?
        LIMIT 1
    `).bind(quoteReference).first();

    if (!existing) {
        return jsonResponse(
            {
                success: false,
                message: "Quotation not found."
            },
            404,
            request,
            env
        );
    }

    const lockedStatuses = new Set([
        "accepted",
        "declined",
        "expired",
        "cancelled"
    ]);

    if (lockedStatuses.has(existing.status)) {
        return jsonResponse(
            {
                success: false,
                message:
                    "This quotation is locked and can no longer be edited."
            },
            409,
            request,
            env
        );
    }

    const body = await request.json().catch(() => ({}));
    const allowedStatuses = new Set([
        "draft",
        "sent",
        "accepted",
        "declined",
        "expired",
        "cancelled"
    ]);

    if (
        body.status !== undefined &&
        !allowedStatuses.has(text(body.status))
    ) {
        return jsonResponse(
            {
                success: false,
                message: "Please select a valid quotation status."
            },
            422,
            request,
            env
        );
    }

    let data = null;
    let totals = {
        subtotal: Number(existing.subtotal || 0),
        discount: Number(existing.discount || 0),
        deliveryFee: Number(existing.delivery_fee || 0),
        tax: Number(existing.tax || 0),
        grandTotal: Number(existing.grand_total || 0)
    };

    if (body.items !== undefined) {
        const validation = validateQuotationPayload({
            ...body,
            customerName:
                body.customerName ?? existing.customer_name,
            brandName:
                body.brandName ?? existing.brand_name,
            customerEmail:
                body.customerEmail ?? existing.customer_email,
            customerPhone:
                body.customerPhone ?? existing.customer_phone,
            currency:
                body.currency ?? existing.currency,
            issueDate:
                body.issueDate ?? existing.issue_date,
            expiryDate:
                body.expiryDate ?? existing.expiry_date,
            productionTimeline:
                body.productionTimeline ?? existing.production_timeline,
            paymentTerms:
                body.paymentTerms ?? existing.payment_terms,
            notes:
                body.notes ?? existing.notes,
            discount:
                body.discount ?? existing.discount,
            deliveryFee:
                body.deliveryFee ?? existing.delivery_fee,
            tax:
                body.tax ?? existing.tax
        });

        if (validation.errors.length) {
            return jsonResponse(
                {
                    success: false,
                    message: validation.errors[0],
                    errors: validation.errors.map((message) => ({ message }))
                },
                422,
                request,
                env
            );
        }

        data = validation.data;
        totals = calculateQuotationTotals(data);
    }

    const now = new Date().toISOString();

    const status = body.status !== undefined
        ? text(body.status)
        : existing.status;

    const customerName = text(
        body.customerName ?? existing.customer_name
    );

    const brandName = text(
        body.brandName ?? existing.brand_name
    );

    const customerEmail = text(
        body.customerEmail ?? existing.customer_email
    ).toLowerCase();

    const customerPhone = text(
        body.customerPhone ?? existing.customer_phone
    );

    const customerId = await upsertQuotationCustomer(env.DB, {
        customerName,
        brandName,
        email: customerEmail,
        phone: customerPhone,
        now
    });

    await env.DB.prepare(`
        UPDATE quotations
        SET
            customer_id = ?,
            status = ?,
            customer_name = ?,
            brand_name = ?,
            customer_email = ?,
            customer_phone = ?,
            currency = ?,
            issue_date = ?,
            expiry_date = ?,
            production_timeline = ?,
            payment_terms = ?,
            notes = ?,
            subtotal = ?,
            discount = ?,
            delivery_fee = ?,
            tax = ?,
            grand_total = ?,
            updated_at = ?
        WHERE quote_reference = ?
    `).bind(
        customerId,
        status,
        customerName,
        brandName,
        customerEmail,
        customerPhone,
        text(body.currency ?? existing.currency) || "NGN",
        text(body.issueDate ?? existing.issue_date),
        text(body.expiryDate ?? existing.expiry_date),
        text(body.productionTimeline ?? existing.production_timeline),
        text(body.paymentTerms ?? existing.payment_terms),
        text(body.notes ?? existing.notes),
        totals.subtotal,
        totals.discount,
        totals.deliveryFee,
        totals.tax,
        totals.grandTotal,
        now,
        quoteReference
    ).run();

    if (data?.items) {
        await replaceQuotationItems(
            env.DB,
            existing.id,
            data.items,
            now
        );
    }

    return jsonResponse(
        {
            success: true,
            message: "Quotation updated.",
            quotation: {
                quoteReference,
                status,
                grandTotal: totals.grandTotal
            }
        },
        200,
        request,
        env
    );
}



async function handlePublicQuotationRequest(request, env, url) {
    const match = url.pathname.match(
        /^\/public\/quotations\/([A-Za-z0-9_-]{32,})$/
    );

    if (!match) {
        return jsonResponse(
            {
                success: false,
                message: "Quotation link is invalid."
            },
            404,
            request,
            env
        );
    }

    if (request.method === "GET") {
        return await handlePublicQuotationView(request, env, match[1]);
    }

    if (request.method === "POST") {
        return await handlePublicQuotationResponse(request, env, match[1]);
    }

    return jsonResponse(
        {
            success: false,
            message: "Method not allowed."
        },
        405,
        request,
        env
    );
}

async function handlePublicQuotationView(request, env, publicToken) {
    const quotation = await env.DB.prepare(`
        SELECT *
        FROM quotations
        WHERE public_token = ?
        LIMIT 1
    `).bind(publicToken).first();

    if (!quotation) {
        return jsonResponse(
            {
                success: false,
                message: "This quotation link is invalid or no longer available."
            },
            404,
            request,
            env
        );
    }

    const now = new Date();
    const nowIso = now.toISOString();
    let status = text(quotation.status);

    if (
        quotation.expiry_date &&
        !["accepted", "declined", "cancelled"].includes(status)
    ) {
        const expiry = new Date(`${quotation.expiry_date}T23:59:59Z`);

        if (!Number.isNaN(expiry.getTime()) && now > expiry) {
            status = "expired";

            await env.DB.prepare(`
                UPDATE quotations
                SET status = 'expired', updated_at = ?
                WHERE id = ?
            `).bind(nowIso, quotation.id).run();

            if (quotation.status !== "expired") {
                await recordQuotationActivity(env.DB, {
                    quotationId: quotation.id,
                    activityType: "expired",
                    title: "Quotation expired",
                    details: "The quotation passed its validity date.",
                    actor: "system",
                    createdAt: nowIso
                });
            }
        }
    }

    const wasNeverViewed = !quotation.viewed_at;

    await env.DB.prepare(`
        UPDATE quotations
        SET
            viewed_at = COALESCE(viewed_at, ?),
            last_viewed_at = ?,
            view_count = COALESCE(view_count, 0) + 1,
            updated_at = ?
        WHERE id = ?
    `).bind(
        nowIso,
        nowIso,
        nowIso,
        quotation.id
    ).run();

    if (wasNeverViewed) {
        await recordQuotationActivity(env.DB, {
            quotationId: quotation.id,
            activityType: "viewed",
            title: "Customer viewed quotation",
            details: "The secure quotation page was opened.",
            actor: "customer",
            createdAt: nowIso
        });
    }

    const items = await env.DB.prepare(`
        SELECT
            item_order,
            description,
            details,
            quantity,
            unit_price,
            line_total
        FROM quotation_items
        WHERE quotation_id = ?
        ORDER BY item_order ASC, id ASC
    `).bind(quotation.id).all();

    return jsonResponse(
        {
            success: true,
            quotation: {
                quoteReference: quotation.quote_reference,
                status,
                customerName: quotation.customer_name,
                brandName: quotation.brand_name,
                currency: quotation.currency,
                issueDate: quotation.issue_date,
                expiryDate: quotation.expiry_date,
                productionTimeline: quotation.production_timeline,
                paymentTerms: quotation.payment_terms,
                notes: quotation.notes,
                subtotal: Number(quotation.subtotal || 0),
                discount: Number(quotation.discount || 0),
                deliveryFee: Number(quotation.delivery_fee || 0),
                tax: Number(quotation.tax || 0),
                grandTotal: Number(quotation.grand_total || 0),
                respondedAt: quotation.responded_at,
                responseType: quotation.response_type,
                responseComment: quotation.response_comment,
                items: items.results || []
            }
        },
        200,
        request,
        env
    );
}

async function handlePublicQuotationResponse(request, env, publicToken) {
    const quotation = await env.DB.prepare(`
        SELECT *
        FROM quotations
        WHERE public_token = ?
        LIMIT 1
    `).bind(publicToken).first();

    if (!quotation) {
        return jsonResponse(
            {
                success: false,
                message: "This quotation link is invalid or no longer available."
            },
            404,
            request,
            env
        );
    }

    const body = await request.json().catch(() => ({}));
    const action = text(body.action);
    const comment = text(body.comment).slice(0, 3000);
    const reason = text(body.reason).slice(0, 500);

    const allowedActions = new Set([
        "accepted",
        "needs_revision",
        "declined"
    ]);

    if (!allowedActions.has(action)) {
        return jsonResponse(
            {
                success: false,
                message: "Please select a valid response."
            },
            422,
            request,
            env
        );
    }

    if (action === "needs_revision" && !comment) {
        return jsonResponse(
            {
                success: false,
                message: "Please describe the changes you would like."
            },
            422,
            request,
            env
        );
    }

    if (action === "declined" && !reason) {
        return jsonResponse(
            {
                success: false,
                message: "Please select a reason for declining."
            },
            422,
            request,
            env
        );
    }

    if (quotation.status === "expired") {
        return jsonResponse(
            {
                success: false,
                message: "This quotation has expired. Please contact Luxsome Packaging."
            },
            409,
            request,
            env
        );
    }

    if (quotation.status === "cancelled") {
        return jsonResponse(
            {
                success: false,
                message: "This quotation is no longer active."
            },
            409,
            request,
            env
        );
    }

    const now = new Date().toISOString();
    const databaseStatus =
        action === "needs_revision" ? "sent" : action;

    try {
        await env.DB.prepare(`
            UPDATE quotations
            SET
                status = ?,
                response_type = ?,
                response_comment = ?,
                response_reason = ?,
                responded_at = ?,
                accepted_at = CASE
                    WHEN ? = 'accepted' THEN ?
                    ELSE accepted_at
                END,
                declined_at = CASE
                    WHEN ? = 'declined' THEN ?
                    ELSE declined_at
                END,
                updated_at = ?
            WHERE id = ?
        `).bind(
            databaseStatus,
            action,
            comment || null,
            reason || null,
            now,
            action,
            now,
            action,
            now,
            now,
            quotation.id
        ).run();
    } catch (error) {
        console.error(
            "Public quotation response database update failed",
            {
                quoteReference: quotation.quote_reference,
                action,
                error
            }
        );

        console.error("Quotation update failed:", error);

        return jsonResponse(
            {
                success: false,
                message: String(error),
            },
            500,
            request,
            env
        );
    }

    const activityTitle = {
        accepted: "Customer accepted quotation",
        needs_revision: "Customer requested changes",
        declined: "Customer declined quotation"
    }[action];

    const detailParts = [];

    if (reason) detailParts.push(`Reason: ${reason}.`);
    if (comment) detailParts.push(`Comment: ${comment}`);

    /*
     * The customer response has already been saved. Activity logging and
     * email notification must not make the public response appear to fail.
     */
    try {
        await recordQuotationActivity(env.DB, {
            quotationId: quotation.id,
            activityType: action,
            title: activityTitle,
            details: detailParts.join(" ") || null,
            actor: "customer",
            createdAt: now
        });
    } catch (error) {
        console.error(
            "Quotation response activity could not be recorded",
            {
                quoteReference: quotation.quote_reference,
                action,
                error
            }
        );
    }

    try {
        await sendQuotationResponseNotification(env, {
            quotation,
            action,
            comment,
            reason,
            now
        });
    } catch (error) {
        console.error(
            "Quotation response notification could not be sent",
            {
                quoteReference: quotation.quote_reference,
                action,
                error
            }
        );
    }

    let automaticInvoice = null;
    let automaticInvoiceError = "";

    if (action === "accepted") {
        try {
            automaticInvoice =
                await createAndSendInvoiceForAcceptedQuotation(
                    env,
                    {
                        ...quotation,
                        status: "accepted",
                        response_type: "accepted",
                        accepted_at: now
                    }
                );
        } catch (error) {
            automaticInvoiceError =
                error instanceof Error
                    ? error.message
                    : String(error);

            console.error(
                "Accepted quotation invoice automation failed",
                {
                    quoteReference: quotation.quote_reference,
                    error
                }
            );

            try {
                await recordQuotationActivity(env.DB, {
                    quotationId: quotation.id,
                    activityType: "invoice_automation_failed",
                    title: "Automatic invoice delivery failed",
                    details: automaticInvoiceError,
                    actor: "system",
                    createdAt: new Date().toISOString()
                });
            } catch (activityError) {
                console.error(
                    "Invoice automation failure activity could not be recorded",
                    activityError
                );
            }
        }
    }

    return jsonResponse(
        {
            success: true,
            message: {
                accepted:
                    automaticInvoice
                        ? "Quotation accepted. Your invoice has been emailed and is ready for payment."
                        : "Quotation accepted. Your response has been recorded.",
                needs_revision:
                    "Your change request has been sent to Luxsome Packaging.",
                declined:
                    "Your response has been recorded. Thank you for letting us know."
            }[action],
            response: {
                status: action,
                respondedAt: now,
                invoiceReference:
                    automaticInvoice?.invoiceReference || null,
                invoiceSent:
                    Boolean(automaticInvoice?.sent),
                invoiceAutomationError:
                    automaticInvoiceError || null
            }
        },
        200,
        request,
        env
    );
}

async function sendQuotationResponseNotification(
    env,
    { quotation, action, comment, reason, now }
) {
    if (!env.RESEND_API_KEY || !env.FROM_EMAIL || !env.INTERNAL_EMAIL) {
        return;
    }

    const label = {
        accepted: "Accepted",
        needs_revision: "Changes requested",
        declined: "Declined"
    }[action];

    const details = [
        reason ? `<p><strong>Reason:</strong> ${escapeHtml(reason)}</p>` : "",
        comment ? `<p><strong>Comment:</strong> ${escapeHtml(comment)}</p>` : ""
    ].join("");

    const payload = {
        from: env.FROM_EMAIL,
        to: [env.INTERNAL_EMAIL],
        subject: `${label}: ${quotation.quote_reference}`,
        html: `
            <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#2e1c15;">
                <h1 style="font-family:Georgia,serif;">Quotation response</h1>
                <p><strong>Quotation:</strong> ${escapeHtml(quotation.quote_reference)}</p>
                <p><strong>Customer:</strong> ${escapeHtml(
                    text(quotation.brand_name) ||
                    text(quotation.customer_name)
                )}</p>
                <p><strong>Response:</strong> ${escapeHtml(label)}</p>
                <p><strong>Responded:</strong> ${escapeHtml(now)}</p>
                ${details}
                <p style="margin-top:24px;">Open the Luxsome CRM to review the quotation.</p>
            </div>
        `
    };

    if (env.REPLY_TO_EMAIL) {
        payload.reply_to = env.REPLY_TO_EMAIL;
    }

    try {
        const response = await fetch(RESEND_EMAIL_ENDPOINT, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${env.RESEND_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            console.error(
                "Quotation response notification failed",
                await safeJson(response)
            );
        }
    } catch (error) {
        console.error("Quotation response notification error", error);
    }
}

async function recordQuotationActivity(
    db,
    {
        quotationId,
        activityType,
        title,
        details = null,
        actor = "system",
        createdAt = new Date().toISOString()
    }
) {
    await db.prepare(`
        INSERT INTO quotation_activity (
            quotation_id,
            activity_type,
            title,
            details,
            actor,
            created_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
        quotationId,
        activityType,
        title,
        details,
        actor,
        createdAt
    ).run();
}

function generatePublicToken() {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);

    return Array.from(bytes)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

async function handleAdminQuotationSend(
    request,
    env,
    quoteReference
) {
    const quotation = await env.DB.prepare(`
        SELECT *
        FROM quotations
        WHERE quote_reference = ?
        LIMIT 1
    `).bind(quoteReference).first();

    if (!quotation) {
        return jsonResponse(
            {
                success: false,
                message: "Quotation not found."
            },
            404,
            request,
            env
        );
    }

    if (
        ["accepted", "declined", "expired", "cancelled"].includes(
            quotation.status
        )
    ) {
        return jsonResponse(
            {
                success: false,
                message:
                    "This quotation is locked and cannot be sent again."
            },
            409,
            request,
            env
        );
    }

    const customerEmail = text(quotation.customer_email).toLowerCase();

    if (!isValidEmail(customerEmail)) {
        return jsonResponse(
            {
                success: false,
                message: "Please add a valid customer email before sending."
            },
            422,
            request,
            env
        );
    }

    if (!env.RESEND_API_KEY || !env.FROM_EMAIL) {
        return jsonResponse(
            {
                success: false,
                message: "Quotation email delivery is not configured."
            },
            500,
            request,
            env
        );
    }

    let publicToken = text(quotation.public_token);

    if (!publicToken) {
        publicToken = generatePublicToken();

        await env.DB.prepare(`
            UPDATE quotations
            SET public_token = ?, updated_at = ?
            WHERE id = ?
        `).bind(
            publicToken,
            new Date().toISOString(),
            quotation.id
        ).run();

        quotation.public_token = publicToken;
    }

    const publicSiteUrl = text(env.PUBLIC_SITE_URL) ||
        "https://www.luxsomepackaging.com";

    const quotationUrl =
        `${publicSiteUrl.replace(/\/$/, "")}/quotation/?token=${encodeURIComponent(publicToken)}`;

    const itemsResult = await env.DB.prepare(`
        SELECT
            description,
            details,
            quantity,
            unit_price,
            line_total
        FROM quotation_items
        WHERE quotation_id = ?
        ORDER BY item_order ASC, id ASC
    `).bind(quotation.id).all();

    const items = itemsResult.results || [];
    const body = await request.json().catch(() => ({}));
    const optionalMessage = text(body.message);
    const recipientName =
        text(quotation.customer_name) ||
        text(quotation.brand_name) ||
        "there";

    const subject =
        `Luxsome Packaging quotation ${quotation.quote_reference}`;

    const html = buildQuotationEmailHtml({
        quotation,
        items,
        recipientName,
        optionalMessage,
        quotationUrl
    });

    const emailPayload = {
        from: env.FROM_EMAIL,
        to: [customerEmail],
        subject,
        html
    };

    if (env.REPLY_TO_EMAIL) {
        emailPayload.reply_to = env.REPLY_TO_EMAIL;
    }

    const resendResponse = await fetch(RESEND_EMAIL_ENDPOINT, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${env.RESEND_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(emailPayload)
    });

    const resendData = await safeJson(resendResponse);

    if (!resendResponse.ok) {
        console.error("Resend rejected the quotation email", {
            status: resendResponse.status,
            response: resendData,
            quoteReference
        });

        return jsonResponse(
            {
                success: false,
                message: "The quotation email could not be sent.",
                error:
                    text(resendData?.message) ||
                    "Resend rejected the email request."
            },
            502,
            request,
            env
        );
    }

    const now = new Date().toISOString();

    await env.DB.prepare(`
        UPDATE quotations
        SET
            status = 'sent',
            response_type = NULL,
            response_comment = NULL,
            response_reason = NULL,
            responded_at = NULL,
            sent_at = ?,
            send_count = COALESCE(send_count, 0) + 1,
            resend_email_id = ?,
            updated_at = ?
        WHERE quote_reference = ?
    `).bind(
        now,
        text(resendData?.id),
        now,
        quoteReference
    ).run();

    await recordQuotationActivity(env.DB, {
        quotationId: quotation.id,
        activityType: "sent",
        title: Number(quotation.send_count || 0) > 0
            ? "Quotation resent"
            : "Quotation emailed",
        details: `Sent to ${customerEmail}.`,
        actor: "admin",
        createdAt: now
    });

    return jsonResponse(
        {
            success: true,
            message: "Quotation sent to the customer.",
            quotation: {
                quoteReference,
                status: "sent",
                sentAt: now,
                emailId: text(resendData?.id)
            }
        },
        200,
        request,
        env
    );
}

function buildQuotationEmailHtml({
    quotation,
    items,
    recipientName,
    optionalMessage,
    quotationUrl
}) {
    const brand =
        text(quotation.brand_name) ||
        text(quotation.customer_name) ||
        "Valued customer";

    const itemRows = items.map((item) => `
        <tr>
            <td style="padding:14px 10px;border-bottom:1px solid #ded5ce;vertical-align:top;">
                <strong style="display:block;color:#2e1c15;">
                    ${escapeHtml(text(item.description))}
                </strong>
                ${
                    text(item.details)
                        ? `<span style="display:block;margin-top:5px;color:#795c4d;font-size:12px;line-height:1.5;">${escapeHtml(text(item.details))}</span>`
                        : ""
                }
            </td>
            <td style="padding:14px 10px;border-bottom:1px solid #ded5ce;text-align:center;">
                ${escapeHtml(formatQuotationQuantity(item.quantity))}
            </td>
            <td style="padding:14px 10px;border-bottom:1px solid #ded5ce;text-align:right;">
                ${escapeHtml(formatQuotationMoney(item.unit_price))}
            </td>
            <td style="padding:14px 10px;border-bottom:1px solid #ded5ce;text-align:right;font-weight:700;">
                ${escapeHtml(formatQuotationMoney(item.line_total))}
            </td>
        </tr>
    `).join("");

    const messageBlock = optionalMessage
        ? `<p style="margin:0 0 20px;padding:14px 16px;border-left:3px solid #2e1c15;background:#f8f4ef;line-height:1.7;">${escapeHtml(optionalMessage)}</p>`
        : "";

    return `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#eee8e2;font-family:Arial,sans-serif;color:#2e1c15;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#eee8e2;padding:28px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="680" cellspacing="0" cellpadding="0" style="width:100%;max-width:680px;background:#fffdf9;border-collapse:collapse;">
                    <tr>
                        <td style="padding:30px 34px 22px;border-bottom:2px solid #2e1c15;">
                            <table role="presentation" width="100%">
                                <tr>
                                    <td>
                                        <div style="font-family:Georgia,serif;font-size:27px;letter-spacing:3px;">LUXSOME</div>
                                        <div style="font-size:9px;letter-spacing:5px;margin-top:3px;">PACKAGING</div>
                                    </td>
                                    <td align="right">
                                        <div style="font-size:10px;letter-spacing:3px;">QUOTATION</div>
                                        <div style="font-family:Georgia,serif;font-size:24px;margin-top:6px;">${escapeHtml(text(quotation.quote_reference))}</div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:30px 34px;">
                            <p style="margin:0 0 12px;">Hello ${escapeHtml(recipientName)},</p>
                            <p style="margin:0 0 20px;line-height:1.7;">
                                Thank you for considering Luxsome Packaging. Please find below our quotation for
                                <strong>${escapeHtml(brand)}</strong>.
                            </p>

                            ${messageBlock}

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:4px 0 28px;">
                                <tr>
                                    <td align="center">
                                        <a href="${escapeHtml(quotationUrl)}"
                                           style="display:inline-block;padding:14px 25px;background:#881010;color:#fffdf9;text-decoration:none;font-weight:700;letter-spacing:1px; border-radius: 8px;">
                                            VIEW AND RESPOND TO QUOTATION
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <table role="presentation" width="100%" style="margin-bottom:24px;background:#f8f4ef;border:1px solid #ded5ce;">
                                <tr>
                                    <td style="padding:12px 14px;">
                                        <span style="display:block;color:#795c4d;font-size:10px;">ISSUE DATE</span>
                                        <strong>${escapeHtml(formatQuotationDate(quotation.issue_date))}</strong>
                                    </td>
                                    <td style="padding:12px 14px;">
                                        <span style="display:block;color:#795c4d;font-size:10px;">VALID UNTIL</span>
                                        <strong>${escapeHtml(formatQuotationDate(quotation.expiry_date))}</strong>
                                    </td>
                                    <td style="padding:12px 14px;">
                                        <span style="display:block;color:#795c4d;font-size:10px;">GRAND TOTAL</span>
                                        <strong>${escapeHtml(formatQuotationMoney(quotation.grand_total))}</strong>
                                    </td>
                                </tr>
                            </table>

                            <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-bottom:25px;">
                                <thead>
                                    <tr style="background:#2e1c15;color:#fffdf9;">
                                        <th align="left" style="padding:11px 10px;font-size:11px;">DESCRIPTION</th>
                                        <th style="padding:11px 10px;font-size:11px;">QTY</th>
                                        <th align="right" style="padding:11px 10px;font-size:11px;">UNIT PRICE</th>
                                        <th align="right" style="padding:11px 10px;font-size:11px;">TOTAL</th>
                                    </tr>
                                </thead>
                                <tbody>${itemRows}</tbody>
                            </table>

                            <table role="presentation" align="right" width="330" style="width:100%;max-width:330px;border:1px solid #ded5ce;margin-bottom:28px;">
                                <tr><td style="padding:10px 12px;color:#795c4d;">Subtotal</td><td align="right" style="padding:10px 12px;font-weight:700;">${escapeHtml(formatQuotationMoney(quotation.subtotal))}</td></tr>
                                <tr><td style="padding:10px 12px;color:#795c4d;">Discount</td><td align="right" style="padding:10px 12px;font-weight:700;">- ${escapeHtml(formatQuotationMoney(quotation.discount))}</td></tr>
                                <tr><td style="padding:10px 12px;color:#795c4d;">Delivery</td><td align="right" style="padding:10px 12px;font-weight:700;">${escapeHtml(formatQuotationMoney(quotation.delivery_fee))}</td></tr>
                                <tr><td style="padding:10px 12px;color:#795c4d;">Tax</td><td align="right" style="padding:10px 12px;font-weight:700;">${escapeHtml(formatQuotationMoney(quotation.tax))}</td></tr>
                                <tr style="background:#2e1c15;color:#fffdf9;"><td style="padding:13px 12px;">Grand total</td><td align="right" style="padding:13px 12px;font-family:Georgia,serif;font-size:20px;">${escapeHtml(formatQuotationMoney(quotation.grand_total))}</td></tr>
                            </table>

                            <div style="clear:both;"></div>

                            <div style="margin-top:26px;padding-top:20px;border-top:1px solid #ded5ce;">
                                <p style="margin:0 0 6px;color:#795c4d;font-size:10px;letter-spacing:2px;">PRODUCTION TIMELINE</p>
                                <p style="margin:0 0 18px;line-height:1.6;">${escapeHtml(text(quotation.production_timeline) || "To be confirmed.")}</p>

                                <p style="margin:0 0 6px;color:#795c4d;font-size:10px;letter-spacing:2px;">PAYMENT TERMS</p>
                                <p style="margin:0 0 18px;line-height:1.6;">${escapeHtml(text(quotation.payment_terms) || "To be confirmed.")}</p>

                                ${
                                    text(quotation.notes)
                                        ? `<p style="margin:0 0 6px;color:#795c4d;font-size:10px;letter-spacing:2px;">NOTES</p><p style="margin:0;line-height:1.6;">${escapeHtml(text(quotation.notes))}</p>`
                                        : ""
                                }
                            </div>
                        </td>
                    </tr>

                    <tr>
                        <td style="padding:22px 34px;background:#2e1c15;color:#fffdf9;">
                            <strong style="font-family:Georgia,serif;font-size:16px;">Packaging is not a product.</strong>
                            <span style="display:block;margin-top:5px;color:#d8cec7;font-size:12px;">It is a system, and we build it end to end.</span>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
}

function formatQuotationMoney(value) {
    return new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0
    }).format(Number(value) || 0);
}

function formatQuotationDate(value) {
    if (!value) return "—";

    const parsed = new Date(`${value}T00:00:00Z`);

    if (Number.isNaN(parsed.getTime())) return text(value);

    return new Intl.DateTimeFormat("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC"
    }).format(parsed);
}

function formatQuotationQuantity(value) {
    const number = Number(value);

    if (!Number.isFinite(number)) return "0";

    return Number.isInteger(number)
        ? String(number)
        : number.toFixed(2).replace(/\.?0+$/, "");
}

function validateQuotationPayload(body) {
    const errors = [];
    const items = Array.isArray(body.items)
        ? body.items
        : [];

    const cleanItems = items.map((item, index) => {
        const description = text(item.description);
        const details = text(item.details);
        const quantity = Number(item.quantity);
        const unitPrice = Number(item.unitPrice);

        if (!description) {
            errors.push(
                `Quotation item ${index + 1} needs a description.`
            );
        }

        if (!Number.isFinite(quantity) || quantity <= 0) {
            errors.push(
                `Quotation item ${index + 1} needs a valid quantity.`
            );
        }

        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
            errors.push(
                `Quotation item ${index + 1} needs a valid unit price.`
            );
        }

        return {
            description: description.slice(0, 240),
            details: details.slice(0, 1000),
            quantity,
            unitPrice: Math.round(unitPrice)
        };
    });

    if (!cleanItems.length) {
        errors.push("Add at least one quotation item.");
    }

    const issueDate = text(body.issueDate);
    const expiryDate = text(body.expiryDate);

    if (!isIsoDate(issueDate)) {
        errors.push("Please provide a valid quotation issue date.");
    }

    if (!isIsoDate(expiryDate)) {
        errors.push("Please provide a valid quotation expiry date.");
    }

    if (
        isIsoDate(issueDate) &&
        isIsoDate(expiryDate) &&
        expiryDate < issueDate
    ) {
        errors.push(
            "The quotation expiry date cannot be before the issue date."
        );
    }

    const discount = normaliseMoney(body.discount);
    const deliveryFee = normaliseMoney(body.deliveryFee);
    const tax = normaliseMoney(body.tax);

    if (discount < 0 || deliveryFee < 0 || tax < 0) {
        errors.push(
            "Discount, delivery fee and tax cannot be negative."
        );
    }

    const customerEmail = text(body.customerEmail).toLowerCase();

    if (customerEmail && !isValidEmail(customerEmail)) {
        errors.push("Please provide a valid customer email address.");
    }

    return {
        errors: [...new Set(errors)],
        data: {
            submissionReference: text(body.submissionReference) || null,
            customerName: text(body.customerName).slice(0, 160),
            brandName: text(body.brandName).slice(0, 160),
            customerEmail,
            customerPhone: text(body.customerPhone).slice(0, 60),
            currency: text(body.currency).toUpperCase().slice(0, 3) || "NGN",
            issueDate,
            expiryDate,
            productionTimeline:
                text(body.productionTimeline).slice(0, 500),
            paymentTerms:
                text(body.paymentTerms).slice(0, 2000),
            notes: text(body.notes).slice(0, 3000),
            discount,
            deliveryFee,
            tax,
            items: cleanItems
        }
    };
}

function calculateQuotationTotals(data) {
    const subtotal = data.items.reduce((sum, item) => {
        return sum + Math.round(item.quantity * item.unitPrice);
    }, 0);

    const discount = Math.min(data.discount, subtotal);
    const deliveryFee = data.deliveryFee;
    const tax = data.tax;
    const grandTotal = Math.max(
        0,
        subtotal - discount + deliveryFee + tax
    );

    return {
        subtotal,
        discount,
        deliveryFee,
        tax,
        grandTotal
    };
}

async function replaceQuotationItems(
    db,
    quotationId,
    items,
    now
) {
    const statements = [
        db.prepare(`
            DELETE FROM quotation_items
            WHERE quotation_id = ?
        `).bind(quotationId)
    ];

    items.forEach((item, index) => {
        statements.push(
            db.prepare(`
                INSERT INTO quotation_items (
                    quotation_id,
                    item_order,
                    description,
                    details,
                    quantity,
                    unit_price,
                    line_total,
                    created_at,
                    updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).bind(
                quotationId,
                index + 1,
                item.description,
                item.details,
                item.quantity,
                item.unitPrice,
                Math.round(item.quantity * item.unitPrice),
                now,
                now
            )
        );
    });

    await db.batch(statements);
}

async function upsertQuotationCustomer(db, customer) {
    const email = text(customer.email).toLowerCase();

    if (!email) {
        return null;
    }

    await db.prepare(`
        INSERT INTO customers (
            customer_name,
            brand_name,
            email,
            phone,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(email) DO UPDATE SET
            customer_name = CASE
                WHEN excluded.customer_name <> ''
                THEN excluded.customer_name
                ELSE customers.customer_name
            END,
            brand_name = CASE
                WHEN excluded.brand_name <> ''
                THEN excluded.brand_name
                ELSE customers.brand_name
            END,
            phone = CASE
                WHEN excluded.phone <> ''
                THEN excluded.phone
                ELSE customers.phone
            END,
            updated_at = excluded.updated_at
    `).bind(
        customer.customerName || "",
        customer.brandName || "",
        email,
        customer.phone || "",
        customer.now,
        customer.now
    ).run();

    const row = await db.prepare(`
        SELECT id
        FROM customers
        WHERE email = ?
        LIMIT 1
    `).bind(email).first();

    return row?.id || null;
}

async function generateQuoteReference(db) {
    const year = new Date().getUTCFullYear();

    for (let attempt = 0; attempt < 8; attempt += 1) {
        const random =
            crypto.getRandomValues(new Uint32Array(1))[0] %
            90000 +
            10000;

        const reference = `LQ-${year}-${random}`;

        const existing = await db.prepare(`
            SELECT id
            FROM quotations
            WHERE quote_reference = ?
            LIMIT 1
        `).bind(reference).first();

        if (!existing) {
            return reference;
        }
    }

    throw new Error("A unique quotation reference could not be generated.");
}

function normaliseMoney(value) {
    const number = Number(value || 0);

    if (!Number.isFinite(number)) {
        return 0;
    }

    return Math.round(number);
}

function isIsoDate(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(text(value));
}

function assertAdminEnvironment(env) {
    if (!env.DB) {
        throw new Error("Missing Cloudflare D1 binding: DB");
    }

    if (!env.ADMIN_API_TOKEN) {
        throw new Error(
            "Missing Worker environment variable: ADMIN_API_TOKEN"
        );
    }
}

function isAdminAuthorised(request, env) {
    const authorisation = request.headers.get("Authorization") || "";
    const providedToken = authorisation.startsWith("Bearer ")
        ? authorisation.slice(7).trim()
        : "";

    return Boolean(
        providedToken &&
        env.ADMIN_API_TOKEN &&
        constantTimeEqual(providedToken, env.ADMIN_API_TOKEN)
    );
}

function constantTimeEqual(left, right) {
    if (left.length !== right.length) return false;

    let result = 0;

    for (let index = 0; index < left.length; index += 1) {
        result |= left.charCodeAt(index) ^ right.charCodeAt(index);
    }

    return result === 0;
}

async function handleProjectSubmission(request, env) {
    try {
        assertEnvironment(env);

        const contentLength = Number(request.headers.get("Content-Length") || 0);
        if (contentLength > 150_000) {
            return jsonResponse(
                {
                    success: false,
                    message: "The project brief is too large. Please shorten the notes and try again."
                },
                413,
                request,
                env
            );
        }

        const formData = await request.formData();
        const data = normaliseFormData(formData);

        // Honeypot: return a normal success response so bots receive no useful signal.
        if (text(data._gotcha)) {
            return jsonResponse(
                {
                    success: true,
                    reference: safeProjectReference(data.project_reference)
                },
                200,
                request,
                env
            );
        }

        const validationErrors = validateProject(data);
        if (validationErrors.length) {
            return jsonResponse(
                {
                    success: false,
                    message: validationErrors[0],
                    errors: validationErrors.map((message) => ({ message }))
                },
                422,
                request,
                env
            );
        }

        const projectReference = safeProjectReference(data.project_reference);
        const customerEmail = text(data.email).toLowerCase();
        const brandName = text(data.brand_name) || "Unnamed Brand";
        const customerName = text(data.name);

        await saveSubmission(env.DB, {
            reference: projectReference,
            submissionType: "project",
            status: "new",
            customerName,
            brandName,
            email: customerEmail,
            phone: text(data.phone),
            summary: text(data.project_summary) || text(data.submitted_packaging_system),
            payload: data
        });

        const internalEmail = buildInternalEmail(data, projectReference);
        const customerEmailHtml = buildCustomerEmail(data, projectReference);

        const resendResponse = await fetch(RESEND_BATCH_ENDPOINT, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${env.RESEND_API_KEY}`,
                "Content-Type": "application/json",
                "Idempotency-Key": `luxsome-project/${projectReference}`
            },
            body: JSON.stringify([
                {
                    from: env.FROM_EMAIL,
                    to: [env.INTERNAL_EMAIL],
                    reply_to: customerEmail,
                    subject: `New Project Brief | ${projectReference} | ${brandName}`,
                    html: internalEmail,
                    text: buildInternalText(data, projectReference),
                    tags: [
                        { name: "email_type", value: "internal_project_brief" },
                        { name: "project_reference", value: tagValue(projectReference) }
                    ]
                },
                {
                    from: env.FROM_EMAIL,
                    to: [customerEmail],
                    reply_to: env.REPLY_TO_EMAIL,
                    subject: `We’ve received your project — ${projectReference}`,
                    html: customerEmailHtml,
                    text: buildCustomerText(data, projectReference),
                    tags: [
                        { name: "email_type", value: "customer_confirmation" },
                        { name: "project_reference", value: tagValue(projectReference) }
                    ]
                }
            ])
        });

        const resendData = await safeJson(resendResponse);

        if (!resendResponse.ok) {
            console.error("Resend rejected the project emails", {
                status: resendResponse.status,
                response: resendData,
                projectReference
            });

            await updateSubmissionEmailStatus(
                env.DB,
                projectReference,
                "failed",
                JSON.stringify(resendData || {})
            );

            return jsonResponse(
                {
                    success: false,
                    message: "Your brief could not be delivered right now. Please wait a moment and try again."
                },
                502,
                request,
                env
            );
        }

        await updateSubmissionEmailStatus(
            env.DB,
            projectReference,
            "sent",
            ""
        );

        return jsonResponse(
            {
                success: true,
                message: "Project brief submitted successfully.",
                reference: projectReference,
                customer: {
                    name: customerName,
                    email: customerEmail
                }
            },
            200,
            request,
            env
        );
    } catch (error) {
        console.error("Project submission failed", error);

        return jsonResponse(
            {
                success: false,
                message: "We could not submit your project brief. Please check your connection and try again."
            },
            500,
            request,
            env
        );
    }
}

async function handleContactSubmission(request, env) {
    try {
        assertEnvironment(env);

        const contentLength = Number(request.headers.get("Content-Length") || 0);
        if (contentLength > 40_000) {
            return jsonResponse(
                {
                    success: false,
                    message: "Your message is too large. Please shorten it and try again."
                },
                413,
                request,
                env
            );
        }

        const formData = await request.formData();
        const data = normaliseFormData(formData);

        // Honeypot: return a normal success response without sending email.
        if (text(data._gotcha)) {
            return jsonResponse(
                {
                    success: true,
                    message: "Message received."
                },
                200,
                request,
                env
            );
        }

        const validationErrors = validateContact(data);
        if (validationErrors.length) {
            return jsonResponse(
                {
                    success: false,
                    message: validationErrors[0],
                    errors: validationErrors.map((message) => ({ message }))
                },
                422,
                request,
                env
            );
        }

        const enquiryReference = safeContactReference(data.enquiry_reference);
        const customerEmail = text(data.emailAddress || data.email).toLowerCase();
        const brandName = text(data.brandName);
        const phoneNumber = text(data.phoneNumber);
        const message = text(data.message);

        await saveSubmission(env.DB, {
            reference: enquiryReference,
            submissionType: "contact",
            status: "new",
            customerName: "",
            brandName,
            email: customerEmail,
            phone: phoneNumber,
            summary: message.slice(0, 240),
            payload: data
        });

        const resendResponse = await fetch(RESEND_BATCH_ENDPOINT, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${env.RESEND_API_KEY}`,
                "Content-Type": "application/json",
                "Idempotency-Key": `luxsome-contact/${enquiryReference}`
            },
            body: JSON.stringify([
                {
                    from: env.FROM_EMAIL,
                    to: [env.INTERNAL_EMAIL],
                    reply_to: customerEmail,
                    subject: `New Contact Enquiry | ${enquiryReference} | ${brandName}`,
                    html: buildContactInternalEmail(data, enquiryReference),
                    text: buildContactInternalText(data, enquiryReference),
                    tags: [
                        { name: "email_type", value: "internal_contact_enquiry" },
                        { name: "enquiry_reference", value: tagValue(enquiryReference) }
                    ]
                },
                {
                    from: env.FROM_EMAIL,
                    to: [customerEmail],
                    reply_to: env.REPLY_TO_EMAIL,
                    subject: `We’ve received your message — ${enquiryReference}`,
                    html: buildContactCustomerEmail(data, enquiryReference),
                    text: buildContactCustomerText(data, enquiryReference),
                    tags: [
                        { name: "email_type", value: "customer_contact_confirmation" },
                        { name: "enquiry_reference", value: tagValue(enquiryReference) }
                    ]
                }
            ])
        });

        const resendData = await safeJson(resendResponse);

        if (!resendResponse.ok) {
            console.error("Resend rejected the contact emails", {
                status: resendResponse.status,
                response: resendData,
                enquiryReference
            });

            await updateSubmissionEmailStatus(
                env.DB,
                enquiryReference,
                "failed",
                JSON.stringify(resendData || {})
            );

            return jsonResponse(
                {
                    success: false,
                    message: "Your message could not be delivered right now. Please wait a moment and try again."
                },
                502,
                request,
                env
            );
        }

        await updateSubmissionEmailStatus(
            env.DB,
            enquiryReference,
            "sent",
            ""
        );

        return jsonResponse(
            {
                success: true,
                message: "Your message has been sent successfully.",
                reference: enquiryReference,
                customer: {
                    brandName,
                    email: customerEmail,
                    phone: phoneNumber
                }
            },
            200,
            request,
            env
        );
    } catch (error) {
        console.error("Contact submission failed", error);

        return jsonResponse(
            {
                success: false,
                message: "We could not send your message. Please check your connection and try again."
            },
            500,
            request,
            env
        );
    }
}

function validateContact(data) {
    const errors = [];
    const brandName = text(data.brandName);
    const phoneNumber = text(data.phoneNumber);
    const emailAddress = text(data.emailAddress || data.email);
    const message = text(data.message);
    const phoneDigits = phoneNumber.replace(/\D/g, "");

    if (brandName.length < 2 || brandName.length > 100) {
        errors.push("Please enter a valid brand name.");
    }

    if (!/^\+?[0-9\s()-]+$/.test(phoneNumber)) {
        errors.push("Phone number must contain only numbers and valid phone symbols.");
    } else if (phoneDigits.length < 10 || phoneDigits.length > 15) {
        errors.push("Please enter a valid phone number with 10 to 15 digits.");
    }

    if (!isValidEmail(emailAddress)) {
        errors.push("Please enter a valid email address.");
    }

    if (message.length < 10) {
        errors.push("Please provide a little more information about your enquiry.");
    } else if (message.length > 1500) {
        errors.push("Your message must not exceed 1,500 characters.");
    }

    return [...new Set(errors)];
}

function buildContactInternalEmail(data, reference) {
    const customerEmail = text(data.emailAddress || data.email);
    const phoneNumber = text(data.phoneNumber);
    const phoneLink = whatsappLink(phoneNumber);

    return emailShell(`
        <p style="margin:0 0 10px;font:600 11px/1.4 Arial,sans-serif;letter-spacing:2.3px;text-transform:uppercase;color:#8d654d;">New contact enquiry</p>
        <h1 style="margin:0 0 14px;font:400 34px/1.15 Georgia,serif;color:#2e1c15;">A new message is waiting for your response.</h1>
        <p style="margin:0;color:#6d574b;font:400 15px/1.75 Arial,sans-serif;">${escapeHtml(text(data.brandName))} contacted Luxsome through the website contact page.</p>

        ${contactReferenceBlock(reference)}

        ${section("Contact details", [
            row("Brand name", data.brandName),
            row("Email", customerEmail),
            row("Phone", phoneNumber)
        ])}

        <div style="margin:28px 0 0;padding:22px 24px;background:#fff;border:1px solid #eadfd7;">
            <p style="margin:0 0 10px;font:600 11px Arial,sans-serif;letter-spacing:1.5px;text-transform:uppercase;color:#8d654d;">Customer message</p>
            <p style="margin:0;white-space:pre-wrap;color:#3f3029;font:400 14px/1.75 Arial,sans-serif;">${escapeHtml(text(data.message))}</p>
        </div>

        <table role="presentation" cellspacing="0" cellpadding="0" style="margin:30px 0 4px;"><tr>
            <td style="padding-right:10px;"><a href="mailto:${encodeURIComponent(customerEmail)}?subject=${encodeURIComponent(`Re: Luxsome enquiry ${reference}`)}" style="display:inline-block;padding:13px 18px;background:#2e1c15;color:#fff;text-decoration:none;font:600 12px Arial,sans-serif;letter-spacing:.7px;">REPLY BY EMAIL</a></td>
            <td><a href="${phoneLink}" style="display:inline-block;padding:12px 18px;border:1px solid #2e1c15;color:#2e1c15;text-decoration:none;font:600 12px Arial,sans-serif;letter-spacing:.7px;">OPEN WHATSAPP</a></td>
        </tr></table>
    `, `New contact enquiry · ${reference}`);
}

function buildContactCustomerEmail(data, reference) {
    const brandName = escapeHtml(text(data.brandName));

    return emailShell(`
        <div style="text-align:center;padding:5px 0 2px;">
            <div style="width:54px;height:54px;margin:0 auto 22px;border:1px solid #a77b5f;border-radius:50%;font:400 28px/54px Georgia,serif;color:#7b513b;">✓</div>
            <p style="margin:0 0 10px;font:600 11px/1.4 Arial,sans-serif;letter-spacing:2.3px;text-transform:uppercase;color:#8d654d;">Message received</p>
            <h1 style="margin:0 0 15px;font:400 36px/1.15 Georgia,serif;color:#2e1c15;">Thank you, ${brandName}.</h1>
            <p style="max-width:520px;margin:0 auto;color:#6d574b;font:400 15px/1.8 Arial,sans-serif;">Your enquiry has reached the Luxsome team. We will review your message and respond using the contact details you provided.</p>
        </div>

        ${contactReferenceBlock(reference)}

        <div style="margin:28px 0;padding:24px;background:#fff;border:1px solid #eadfd7;">
            <p style="margin:0 0 13px;font:600 11px Arial,sans-serif;letter-spacing:1.8px;text-transform:uppercase;color:#8d654d;">What happens next</p>
            <p style="margin:0 0 10px;color:#3f3029;font:400 14px/1.75 Arial,sans-serif;"><strong>1.</strong> We review your question and identify the most helpful response.</p>
            <p style="margin:0 0 10px;color:#3f3029;font:400 14px/1.75 Arial,sans-serif;"><strong>2.</strong> A member of our team replies within one business day.</p>
            <p style="margin:0;color:#3f3029;font:400 14px/1.75 Arial,sans-serif;"><strong>3.</strong> For a full packaging brief, you can also use our guided Start a Project form.</p>
        </div>

        <div style="text-align:center;margin-top:30px;">
            <a href="https://www.luxsomepackaging.com/start-project/" style="display:inline-block;padding:14px 22px;background:#2e1c15;color:#fff;text-decoration:none;font:600 12px Arial,sans-serif;letter-spacing:.8px;">START A PROJECT</a>
        </div>

        <p style="margin:30px 0 0;text-align:center;color:#806b60;font:italic 15px/1.7 Georgia,serif;">Packaging created to be remembered.</p>
    `, `We received your message · ${reference}`);
}

function buildContactInternalText(data, reference) {
    return [
        "LUXSOME PACKAGING — NEW CONTACT ENQUIRY",
        `Reference: ${reference}`,
        "",
        `Brand: ${text(data.brandName)}`,
        `Email: ${text(data.emailAddress || data.email)}`,
        `Phone: ${text(data.phoneNumber)}`,
        "",
        "Message:",
        text(data.message)
    ].join("\n");
}

function buildContactCustomerText(data, reference) {
    return [
        `Thank you, ${text(data.brandName)}.`,
        "",
        "We have received your message.",
        `Enquiry reference: ${reference}`,
        "",
        "A member of the Luxsome team will review your enquiry and reply within one business day.",
        "",
        "Luxsome Packaging",
        "hello@luxsomepackaging.com"
    ].join("\n");
}

function safeContactReference(value) {
    const candidate = text(value).toUpperCase();
    if (/^LC-\d{8}-\d{4}$/.test(candidate)) return candidate;

    const now = new Date();
    const date = [
        now.getUTCFullYear(),
        String(now.getUTCMonth() + 1).padStart(2, "0"),
        String(now.getUTCDate()).padStart(2, "0")
    ].join("");
    const random = crypto.getRandomValues(new Uint32Array(1))[0] % 9000 + 1000;
    return `LC-${date}-${random}`;
}

function contactReferenceBlock(reference) {
    return `<div style="margin:30px 0;padding:21px 24px;background:#2e1c15;text-align:center;">
        <p style="margin:0 0 7px;color:#d5c1b4;font:600 10px Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;">Enquiry reference</p>
        <p style="margin:0;color:#fff;font:400 23px/1.2 Georgia,serif;letter-spacing:1.5px;">${escapeHtml(reference)}</p>
    </div>`;
}

async function saveSubmission(db, submission) {
    const now = new Date().toISOString();

    await db.prepare(`
        INSERT INTO submissions (
            reference,
            submission_type,
            status,
            customer_name,
            brand_name,
            email,
            phone,
            summary,
            payload_json,
            email_status,
            email_error,
            created_at,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', '', ?, ?)
        ON CONFLICT(reference) DO UPDATE SET
            customer_name = excluded.customer_name,
            brand_name = excluded.brand_name,
            email = excluded.email,
            phone = excluded.phone,
            summary = excluded.summary,
            payload_json = excluded.payload_json,
            updated_at = excluded.updated_at
    `).bind(
        submission.reference,
        submission.submissionType,
        submission.status,
        submission.customerName || "",
        submission.brandName || "",
        submission.email || "",
        submission.phone || "",
        submission.summary || "",
        JSON.stringify(submission.payload || {}),
        now,
        now
    ).run();
}

async function updateSubmissionEmailStatus(
    db,
    reference,
    emailStatus,
    emailError = ""
) {
    await db.prepare(`
        UPDATE submissions
        SET email_status = ?, email_error = ?, updated_at = ?
        WHERE reference = ?
    `).bind(
        emailStatus,
        emailError.slice(0, 2000),
        new Date().toISOString(),
        reference
    ).run();
}

function assertEnvironment(env) {
    const required = [
        "RESEND_API_KEY",
        "INTERNAL_EMAIL",
        "FROM_EMAIL",
        "REPLY_TO_EMAIL",
        "ALLOWED_ORIGIN"
    ];

    const missing = required.filter((key) => !env[key]);
    if (missing.length) {
        throw new Error(`Missing Worker configuration: ${missing.join(", ")}`);
    }

    if (!env.DB) {
        throw new Error("Missing Cloudflare D1 binding: DB");
    }
}

function normaliseFormData(formData) {
    const result = {};

    for (const [key, value] of formData.entries()) {
        if (value instanceof File) continue;

        const cleanKey = key.endsWith("[]") ? key.slice(0, -2) : key;
        const cleanValue = String(value).trim();

        if (Object.prototype.hasOwnProperty.call(result, cleanKey)) {
            result[cleanKey] = Array.isArray(result[cleanKey])
                ? [...result[cleanKey], cleanValue]
                : [result[cleanKey], cleanValue];
        } else {
            result[cleanKey] = key.endsWith("[]") ? [cleanValue] : cleanValue;
        }
    }

    return result;
}

function validateProject(data) {
    const errors = [];

    /*
     * These are the only required customer fields currently present
     * on the simplified Start a Project page.
     *
     * Product choices are carried in shop_configuration and the
     * submitted_* hidden fields, so the Worker must not require the
     * old product-category, brand-stage, package-type, component,
     * box-style or required-date fields.
     */
    const requiredFields = [
        {
            field: "name",
            message: "Please enter your full name."
        },
        {
            field: "brand_name",
            message:
                "Please enter your brand or business name."
        },
        {
            field: "email",
            message: "Please enter your email address."
        },
        {
            field: "phone",
            message:
                "Please enter your phone or WhatsApp number."
        },
        {
            field: "preferred_contact_method",
            message:
                "Please select how you would like us to contact you."
        },
        {
            field: "business_location",
            message:
                "Please enter your business location."
        },
        {
            field: "contact_consent",
            message:
                "Please agree to be contacted about this order request."
        }
    ];

    for (const { field, message } of requiredFields) {
        if (!text(data[field])) {
            errors.push(message);
        }
    }

    const email = text(data.email).toLowerCase();

    if (email && !isValidEmail(email)) {
        errors.push("Please enter a valid email address.");
    }

    const phoneDigits = text(data.phone).replace(/\D/g, "");

    if (phoneDigits && phoneDigits.length < 7) {
        errors.push(
            "Please enter a valid phone or WhatsApp number."
        );
    }

    const preferredContactMethod = text(
        data.preferred_contact_method
    ).toLowerCase();

    if (
        preferredContactMethod &&
        !["email", "whatsapp"].includes(
            preferredContactMethod
        )
    ) {
        errors.push(
            "Please select Email or WhatsApp as your preferred contact method."
        );
    }

    return [...new Set(errors)];
}

function preferredContactLabel(value) {
    const method = text(value).toLowerCase();

    if (method === "whatsapp") {
        return "WhatsApp";
    }

    if (method === "email") {
        return "Email";
    }

    return "Not supplied";
}


function parseProjectConfiguration(data) {
    const candidates = [
        data.shop_configuration,
        data.configuration,
        data.project_configuration
    ];

    for (const candidate of candidates) {
        if (
            candidate &&
            typeof candidate === "object" &&
            !Array.isArray(candidate)
        ) {
            return candidate;
        }

        const rawValue = text(candidate);

        if (!rawValue) continue;

        try {
            const parsed = JSON.parse(rawValue);

            if (
                parsed &&
                typeof parsed === "object" &&
                !Array.isArray(parsed)
            ) {
                return parsed;
            }
        } catch (_) {
            // Continue to the next source.
        }
    }

    return {};
}

function configurationValue(
    configuration,
    keys,
    fallback = ""
) {
    for (const key of keys) {
        const value = configuration?.[key];

        if (Array.isArray(value)) {
            const joined = value
                .map(item => text(item))
                .filter(Boolean)
                .join(", ");

            if (joined) return joined;
            continue;
        }

        if (text(value)) {
            return text(value);
        }
    }

    return fallback;
}

function formatProjectQuantity(value) {
    const quantity = text(value);

    if (!quantity) return "";

    if (/piece|box|unit/i.test(quantity)) {
        return quantity;
    }

    return `${quantity} pieces`;
}

function projectDimensions(configuration) {
    const length = configurationValue(
        configuration,
        [
            "finished_length",
            "finishedLength",
            "box_length_cm",
            "box_length",
            "boxLength",
            "boxLengthDisplay",
            "length"
        ]
    );

    const breadth = configurationValue(
        configuration,
        [
            "finished_width",
            "finished_breadth",
            "finishedWidth",
            "finishedBreadth",
            "box_breadth_cm",
            "box_breadth",
            "boxBreadth",
            "boxBreadthDisplay",
            "breadth",
            "width"
        ]
    );

    const height = configurationValue(
        configuration,
        [
            "finished_height",
            "finishedHeight",
            "box_height_cm",
            "box_height",
            "boxHeight",
            "boxHeightDisplay",
            "height"
        ]
    );

    if (!length || !breadth || !height) {
        return configurationValue(
            configuration,
            [
                "finished_dimensions",
                "finishedDimensions",
                "box_dimensions",
                "boxDimensions",
                "dimensions"
            ]
        );
    }

    const values = [length, breadth, height];
    const explicitUnit = values
        .map(value => text(value).match(/\b(mm|cm|in|inch|inches)\b/i)?.[1])
        .find(Boolean);

    const unit = explicitUnit
        ? explicitUnit.toLowerCase().replace("inches", "in").replace("inch", "in")
        : "cm";

    const cleanDimension = value => text(value)
        .replace(/\s*(mm|cm|in|inch|inches)\s*$/i, "")
        .trim();

    return `${cleanDimension(length)} × ${cleanDimension(breadth)} × ${cleanDimension(height)} ${unit}`;
}

function isBespokePackagingSystem(packagingSystem, configuration = {}) {
    const candidates = [
        packagingSystem,
        configuration.system,
        configuration.product_name,
        configuration.product_slug,
        configuration.package_type,
        configuration.project_type
    ]
        .map(value => text(value).toLowerCase())
        .filter(Boolean);

    return candidates.some(value => (
        value === "bespoke" ||
        value.includes("bespoke packaging") ||
        value.includes("bespoke system") ||
        value.includes("/bespoke") ||
        value.includes("shop-bespoke")
    ));
}

function projectEmailSummary(data) {
    const configuration = parseProjectConfiguration(data);

    const packagingSystem =
        configurationValue(
            configuration,
            ["system", "product_name"]
        ) ||
        text(data.submitted_packaging_system) ||
        text(data.package_type);

    const isBespoke = isBespokePackagingSystem(
        packagingSystem,
        configuration
    );

    const packagingPieces = isBespoke
        ? configurationValue(
            configuration,
            ["packaging_pieces"]
        ) || displayList(
            data.submitted_components || data.components,
            "To be confirmed"
        )
        : "";

    const boxQuantity = isBespoke
        ? formatProjectQuantity(
            configurationValue(
                configuration,
                ["box_quantity"]
            )
        )
        : "";

    const otherQuantity = isBespoke
        ? formatProjectQuantity(
            configurationValue(
                configuration,
                ["other_pieces_quantity"]
            )
        )
        : "";

    const generalQuantity = isBespoke
        ? ""
        : formatProjectQuantity(
            configurationValue(
                configuration,
                ["quantity"]
            ) || data.quantity
        );

    const dimensions =
        projectDimensions(configuration) ||
        text(data.finished_dimensions) ||
        text(data.dimensions);

    return {
        configuration,
        packagingSystem,
        isBespoke,
        projectType: isBespoke
            ? configurationValue(configuration, ["project_type"])
            : "",
        packagingPieces,
        boxStyle: configurationValue(configuration, ["box_style"]),
        generalQuantity,
        boxQuantity,
        otherQuantity,
        dimensions,
        weight: configurationValue(configuration, ["volumetric_weight_kg"]),
        colours: projectColours(configuration)
    };
}

function projectPackagingRows(summary) {
    const rows = [
        row("Selected system", summary.packagingSystem)
    ];

    if (summary.isBespoke) {
        rows.push(
            row("Project type", summary.projectType),
            row("Packaging pieces", summary.packagingPieces),
            row("Box style", summary.boxStyle),
            row("Box quantity", summary.boxQuantity),
            row("Other packaging quantity", summary.otherQuantity)
        );
    } else {
        rows.push(
            row("Box style", summary.boxStyle),
            row("Quantity", summary.generalQuantity)
        );
    }

    return rows;
}

function projectPackagingTextLines(summary) {
    const lines = [
        `System: ${summary.packagingSystem || "Not supplied"}`
    ];

    if (summary.isBespoke) {
        lines.push(
            `Project type: ${summary.projectType || "Not supplied"}`,
            `Packaging pieces: ${summary.packagingPieces || "Not supplied"}`,
            `Box style: ${summary.boxStyle || "Not supplied"}`,
            `Box quantity: ${summary.boxQuantity || "Not supplied"}`,
            `Other packaging quantity: ${summary.otherQuantity || "Not supplied"}`
        );
    } else {
        lines.push(
            `Box style: ${summary.boxStyle || "Not supplied"}`,
            `Quantity: ${summary.generalQuantity || "Not supplied"}`
        );
    }

    return lines;
}

function projectColours(configuration) {
    const colours = [
        configurationValue(
            configuration,
            ["primary_colour", "primary_color"]
        ),
        configurationValue(
            configuration,
            ["custom_colour", "custom_color"]
        ),
        configurationValue(
            configuration,
            ["secondary_colour", "secondary_color"]
        ),
        configurationValue(
            configuration,
            ["accent_colour", "accent_color"]
        ),
        configurationValue(
            configuration,
            ["pantone_reference"]
        )
    ].filter(Boolean);

    return [...new Set(colours)].join(", ");
}

function projectPieceDetails(configuration) {
    return [
        ["Hang tag", configurationValue(
            configuration,
            ["tag_style"]
        )],
        ["Thank-you card", configurationValue(
            configuration,
            ["thank_you_card"]
        )],
        ["Sticker seal", configurationValue(
            configuration,
            ["sticker_style"]
        )],
        ["Branded tissue", configurationValue(
            configuration,
            ["tissue_style"]
        )],
        ["Envelope", configurationValue(
            configuration,
            ["envelope_style"]
        )],
        ["Branded ribbon", configurationValue(
            configuration,
            ["ribbon_style"]
        )],
        ["Ribbon colour", configurationValue(
            configuration,
            ["ribbon_colour", "ribbon_color"]
        )]
    ].filter(([, value]) => value);
}

function parseAdditionalProjects(value) {
    if (Array.isArray(value)) {
        return value.filter(
            project =>
                project &&
                typeof project === "object"
        );
    }

    const rawValue = text(value);

    if (!rawValue) return [];

    try {
        const parsed = JSON.parse(rawValue);

        return Array.isArray(parsed)
            ? parsed.filter(
                project =>
                    project &&
                    typeof project === "object"
            )
            : [];
    } catch (_) {
        return [];
    }
}

function additionalProjectsEmail(projects) {
    if (!projects.length) return "";

    const cards = projects.map((project, index) => {
        const brandName =
            text(project.brand_name) ||
            `Additional project ${index + 1}`;

        const pieces = Array.isArray(
            project.packaging_pieces
        )
            ? project.packaging_pieces
                .map(item => text(item))
                .filter(Boolean)
                .join(", ")
            : text(project.packaging_pieces);

        const details = [
            row("Packaging pieces", pieces),
            row("Box style", project.box_style),
            row(
                "Box quantity",
                formatProjectQuantity(
                    project.box_quantity
                )
            ),
            row(
                "Other packaging quantity",
                formatProjectQuantity(
                    project.other_pieces_quantity
                )
            ),
            row("Notes", project.notes)
        ].filter(Boolean).join("");

        return `
            <div style="margin:14px 0 0;padding:18px;background:#fff;border:1px solid #eadfd7;">
                <h3 style="margin:0 0 10px;color:#2e1c15;font:400 19px/1.3 Georgia,serif;">
                    ${escapeHtml(brandName)}
                </h3>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                    ${details}
                </table>
            </div>
        `;
    }).join("");

    return `
        <div style="margin:28px 0 0;">
            <h2 style="margin:0;padding-bottom:11px;border-bottom:1px solid #d9cbc2;color:#2e1c15;font:400 22px/1.3 Georgia,serif;">
                Additional brand projects
            </h2>

            ${cards}
        </div>
    `;
}

function additionalProjectsText(projects) {
    if (!projects.length) return [];

    return projects.flatMap((project, index) => {
        const pieces = Array.isArray(
            project.packaging_pieces
        )
            ? project.packaging_pieces
                .map(item => text(item))
                .filter(Boolean)
                .join(", ")
            : text(project.packaging_pieces);

        return [
            "",
            `ADDITIONAL PROJECT ${index + 1}: ${
                text(project.brand_name) ||
                "Unnamed project"
            }`,
            `Packaging pieces: ${
                pieces || "Not supplied"
            }`,
            `Box style: ${
                text(project.box_style) ||
                "Not supplied"
            }`,
            `Box quantity: ${
                formatProjectQuantity(
                    project.box_quantity
                ) || "Not supplied"
            }`,
            `Other packaging quantity: ${
                formatProjectQuantity(
                    project.other_pieces_quantity
                ) || "Not supplied"
            }`,
            `Notes: ${
                text(project.notes) ||
                "None supplied"
            }`
        ];
    });
}

function buildInternalEmail(data, reference) {
    const summary = projectEmailSummary(data);
    const { configuration } = summary;

    const additionalProjects = parseAdditionalProjects(
        configuration.additional_projects || data.additional_projects
    );

    const phoneLink = whatsappLink(text(data.phone));
    const instagram = text(data.instagram_handle);

    const selectedDetailRows = projectPieceDetails(configuration).map(
        ([label, value]) => row(label, value)
    );

    return emailShell(`
        <p style="margin:0 0 10px;font:600 11px/1.4 Arial,sans-serif;letter-spacing:2.3px;text-transform:uppercase;color:#8d654d;">
            New project enquiry
        </p>

        <h1 style="margin:0 0 14px;font:400 34px/1.15 Georgia,serif;color:#2e1c15;">
            A new packaging request is ready for review.
        </h1>

        <p style="margin:0;color:#6d574b;font:400 15px/1.75 Arial,sans-serif;">
            ${escapeHtml(text(data.brand_name))}
            has submitted a packaging request through the Luxsome Shop.
        </p>

        ${referenceBlock(reference)}

        ${section("Client information", [
            row("Contact person", data.name),
            row("Brand", data.brand_name),
            row("Email", data.email),
            row("Phone / WhatsApp", data.phone),
            row(
                "Preferred contact",
                preferredContactLabel(data.preferred_contact_method)
            ),
            row("Instagram", instagram || "Not supplied"),
            row("Location", data.business_location)
        ])}

        ${section(
            "Packaging system",
            projectPackagingRows(summary)
        )}

        ${
            selectedDetailRows.length
                ? section("Selected packaging details", selectedDetailRows)
                : ""
        }

        ${section("Specifications and branding", [
            row("Finished dimensions", summary.dimensions),
            row(
                "Volumetric weight",
                summary.weight ? `${summary.weight} kg` : ""
            ),
            row("Preferred colours", summary.colours),
            row(
                "Logo finish",
                configurationValue(configuration, ["logo_finish"])
            ),
            row(
                "Logo and artwork status",
                configurationValue(configuration, ["artwork_status"]) ||
                data.artwork_status
            ),
            row(
                "Accessories",
                configurationValue(configuration, ["accessories"])
            )
        ])}

        ${notesBlock(
            configurationValue(configuration, ["comments"]) ||
            data.project_notes
        )}

        ${additionalProjectsEmail(additionalProjects)}

        <table role="presentation" cellspacing="0" cellpadding="0" style="margin:30px 0 4px;">
            <tr>
                <td style="padding-right:10px;">
                    <a
                        href="mailto:${encodeURIComponent(text(data.email))}?subject=${encodeURIComponent(`Re: Luxsome project ${reference}`)}"
                        style="display:inline-block;padding:13px 18px;background:#2e1c15;color:#fff;text-decoration:none;font:600 12px Arial,sans-serif;letter-spacing:.7px;"
                    >
                        REPLY BY EMAIL
                    </a>
                </td>

                <td>
                    <a
                        href="${phoneLink}"
                        style="display:inline-block;padding:12px 18px;border:1px solid #2e1c15;color:#2e1c15;text-decoration:none;font:600 12px Arial,sans-serif;letter-spacing:.7px;"
                    >
                        OPEN WHATSAPP
                    </a>
                </td>
            </tr>
        </table>
    `, `Internal project brief · ${reference}`);
}

function buildCustomerEmail(data, reference) {
    const summary = projectEmailSummary(data);
    const { configuration } = summary;

    const firstName = escapeHtml(
        text(data.name).split(/\s+/)[0] || "there"
    );

    const requestRows = [
        row("Brand", data.brand_name),
        ...projectPackagingRows(summary).map((value, index) => {
            if (index !== 0) return value;
            return row("Packaging system", summary.packagingSystem);
        }),
        row("Finished dimensions", summary.dimensions),
        row("Preferred colours", summary.colours),
        row(
            "Logo and artwork status",
            configurationValue(configuration, ["artwork_status"]) ||
            data.artwork_status
        ),
        row(
            "Preferred contact",
            preferredContactLabel(data.preferred_contact_method)
        )
    ];

    return emailShell(`
        <div style="text-align:center;padding:5px 0 2px;">
            <div style="width:54px;height:54px;margin:0 auto 22px;border:1px solid #a77b5f;border-radius:50%;font:400 28px/54px Georgia,serif;color:#7b513b;">
                ✓
            </div>

            <p style="margin:0 0 10px;font:600 11px/1.4 Arial,sans-serif;letter-spacing:2.3px;text-transform:uppercase;color:#8d654d;">
                Project request received
            </p>

            <h1 style="margin:0 0 15px;font:400 36px/1.15 Georgia,serif;color:#2e1c15;">
                Thank you, ${firstName}.
            </h1>

            <p style="max-width:520px;margin:0 auto;color:#6d574b;font:400 15px/1.8 Arial,sans-serif;">
                Your packaging request is now with the Luxsome team.
                We will review the submitted selections and contact you
                within the next 24 hours through your preferred communication method.
            </p>
        </div>

        ${referenceBlock(reference)}

        ${section("Your request at a glance", requestRows)}

        <div style="margin:28px 0;padding:24px;background:#fff;border:1px solid #eadfd7;">
            <p style="margin:0 0 13px;font:600 11px Arial,sans-serif;letter-spacing:1.8px;text-transform:uppercase;color:#8d654d;">
                What happens next
            </p>

            <p style="margin:0 0 10px;color:#3f3029;font:400 14px/1.75 Arial,sans-serif;">
                <strong>1.</strong>
                We review your selected packaging pieces,
                specifications and artwork status.
            </p>

            <p style="margin:0 0 10px;color:#3f3029;font:400 14px/1.75 Arial,sans-serif;">
                <strong>2.</strong>
                We contact you within 24 hours to confirm any details needed
                before preparing your quotation.
            </p>

            <p style="margin:0;color:#3f3029;font:400 14px/1.75 Arial,sans-serif;">
                <strong>3.</strong>
                Once the scope and quotation are approved,
                the project can move into design and production.
            </p>
        </div>

        <div style="text-align:center;margin-top:30px;">
            <a
                href="https://wa.me/2349068804133?text=${encodeURIComponent(`Hello Luxsome, I have submitted project ${reference}.`)}"
                style="display:inline-block;padding:14px 22px;background:#2e1c15;color:#fff;text-decoration:none;font:600 12px Arial,sans-serif;letter-spacing:.8px;"
            >
                CHAT WITH LUXSOME
            </a>
        </div>

        <p style="margin:30px 0 0;text-align:center;color:#806b60;font:italic 15px/1.7 Georgia,serif;">
            Packaging is not a product. It is a system—and
            we build it end to end.
        </p>
    `, `Project confirmation · ${reference}`);
}

function emailShell(content, previewText) {
    return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eee7e1;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(previewText)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;background:#eee7e1;">
        <tr><td align="center" style="padding:32px 14px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:660px;background:#f8f4ef;border:1px solid #e3d8d0;">
                <tr><td style="padding:24px 38px;border-bottom:1px solid #e3d8d0;text-align:center;">
                    <div style="font:600 15px/1 Arial,sans-serif;letter-spacing:4px;color:#2e1c15;">LUXSOME</div>
                    <div style="margin-top:6px;font:400 8px/1 Arial,sans-serif;letter-spacing:2.2px;color:#806b60;">PACKAGING</div>
                </td></tr>
                <tr><td style="padding:42px 38px;">${content}</td></tr>
                <tr><td style="padding:24px 38px;border-top:1px solid #e3d8d0;text-align:center;color:#806b60;font:400 11px/1.7 Arial,sans-serif;">
                    Luxsome Packaging · Lagos, Nigeria<br>
                    <a href="mailto:hello@luxsomepackaging.com" style="color:#5e4030;text-decoration:none;">hello@luxsomepackaging.com</a>
                </td></tr>
            </table>
        </td></tr>
    </table>
</body>
</html>`;
}

function referenceBlock(reference) {
    return `<div style="margin:30px 0;padding:21px 24px;background:#2e1c15;text-align:center;">
        <p style="margin:0 0 7px;color:#d5c1b4;font:600 10px Arial,sans-serif;letter-spacing:2px;text-transform:uppercase;">Project reference</p>
        <p style="margin:0;color:#fff;font:400 23px/1.2 Georgia,serif;letter-spacing:1.5px;">${escapeHtml(reference)}</p>
    </div>`;
}

function section(title, rows) {
    return `<div style="margin:28px 0 0;">
        <h2 style="margin:0;padding-bottom:11px;border-bottom:1px solid #d9cbc2;color:#2e1c15;font:400 22px/1.3 Georgia,serif;">${escapeHtml(title)}</h2>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${rows.filter(Boolean).join("")}</table>
    </div>`;
}

function row(label, value) {
    const shown = text(value) || "Not supplied";
    return `<tr>
        <td valign="top" style="width:39%;padding:11px 10px 11px 0;border-bottom:1px solid #eadfd7;color:#8a7062;font:600 11px/1.55 Arial,sans-serif;text-transform:uppercase;letter-spacing:.7px;">${escapeHtml(label)}</td>
        <td valign="top" style="padding:11px 0;border-bottom:1px solid #eadfd7;color:#3d2d25;font:400 14px/1.6 Arial,sans-serif;">${escapeHtml(shown)}</td>
    </tr>`;
}

function notesBlock(notes) {
    return `<div style="margin:28px 0 0;padding:22px 24px;background:#fff;border:1px solid #eadfd7;">
        <p style="margin:0 0 10px;font:600 11px Arial,sans-serif;letter-spacing:1.5px;text-transform:uppercase;color:#8d654d;">Project notes</p>
        <p style="margin:0;white-space:pre-wrap;color:#3f3029;font:400 14px/1.75 Arial,sans-serif;">${escapeHtml(text(notes) || "No additional notes were supplied.")}</p>
    </div>`;
}

function buildInternalText(data, reference) {
    const summary = projectEmailSummary(data);
    const { configuration } = summary;

    const additionalProjects = parseAdditionalProjects(
        configuration.additional_projects || data.additional_projects
    );

    const detailLines = projectPieceDetails(configuration).map(
        ([label, value]) => `${label}: ${value}`
    );

    return [
        "LUXSOME PACKAGING — NEW PROJECT REQUEST",
        `Reference: ${reference}`,
        "",
        "CLIENT INFORMATION",
        `Contact: ${text(data.name)}`,
        `Brand: ${text(data.brand_name)}`,
        `Email: ${text(data.email)}`,
        `Phone: ${text(data.phone)}`,
        `Preferred contact: ${preferredContactLabel(data.preferred_contact_method)}`,
        `Instagram: ${text(data.instagram_handle) || "Not supplied"}`,
        `Location: ${text(data.business_location)}`,
        "",
        "PACKAGING SYSTEM",
        ...projectPackagingTextLines(summary),
        ...detailLines,
        "",
        "SPECIFICATIONS AND BRANDING",
        `Finished dimensions: ${summary.dimensions || "Not supplied"}`,
        `Volumetric weight: ${summary.weight ? `${summary.weight} kg` : "Not supplied"}`,
        `Preferred colours: ${summary.colours || "Not supplied"}`,
        `Logo finish: ${configurationValue(configuration, ["logo_finish"]) || "Not supplied"}`,
        `Artwork status: ${configurationValue(configuration, ["artwork_status"]) || text(data.artwork_status) || "Not supplied"}`,
        `Accessories: ${configurationValue(configuration, ["accessories"]) || "Not supplied"}`,
        "",
        `Notes: ${configurationValue(configuration, ["comments"]) || text(data.project_notes) || "None supplied"}`,
        ...additionalProjectsText(additionalProjects)
    ].join("\n");
}

function buildCustomerText(data, reference) {
    const summary = projectEmailSummary(data);

    return [
        `Thank you, ${text(data.name)}.`,
        "",
        "We have received your Luxsome Packaging request.",
        `Project reference: ${reference}`,
        "",
        `Brand: ${text(data.brand_name)}`,
        ...projectPackagingTextLines(summary).map((line, index) => (
            index === 0
                ? line.replace(/^System:/, "Packaging system:")
                : line
        )),
        `Finished dimensions: ${summary.dimensions || "Not supplied"}`,
        `Preferred contact: ${preferredContactLabel(data.preferred_contact_method)}`,
        "",
        "We will review your submitted selections and contact you to confirm any details needed before preparing your quotation.",
        "",
        "Luxsome Packaging",
        "hello@luxsomepackaging.com"
    ].join("\n");
}

function safeProjectReference(value) {
    const candidate = text(value).toUpperCase();
    if (/^LX-\d{8}-\d{4}$/.test(candidate)) return candidate;

    const now = new Date();
    const date = [
        now.getUTCFullYear(),
        String(now.getUTCMonth() + 1).padStart(2, "0"),
        String(now.getUTCDate()).padStart(2, "0")
    ].join("");
    const random = crypto.getRandomValues(new Uint32Array(1))[0] % 9000 + 1000;
    return `LX-${date}-${random}`;
}


/* =========================================================
   ARTWORK UPLOAD — TURNSTILE + PRIVATE R2
========================================================= */

const ARTWORK_ALLOWED_EXTENSIONS = new Set([
    "pdf", "ai", "eps", "svg", "psd",
    "tif", "tiff", "png", "jpg", "jpeg", "zip"
]);

const ARTWORK_MAX_FILE_BYTES = 95 * 1024 * 1024;
const ARTWORK_SESSION_TTL_SECONDS = 20 * 60;

async function handleArtworkRequest(request, env, url) {
    if (!env.ARTWORK_BUCKET) {
        return jsonResponse(
            {
                success: false,
                message: "Artwork storage is not configured."
            },
            500,
            request,
            env
        );
    }

    if (!env.TURNSTILE_SECRET_KEY || !env.UPLOAD_SESSION_SECRET) {
        return jsonResponse(
            {
                success: false,
                message: "Secure artwork uploads are not configured."
            },
            500,
            request,
            env
        );
    }

    if (
        request.method === "POST" &&
        url.pathname === ARTWORK_SESSION_PATH
    ) {
        return handleArtworkSessionCreate(request, env);
    }

    if (
        request.method === "PUT" &&
        url.pathname.startsWith(ARTWORK_UPLOAD_PREFIX)
    ) {
        return handleArtworkFileUpload(request, env, url);
    }

    return jsonResponse(
        {
            success: false,
            message: "Artwork endpoint not found."
        },
        404,
        request,
        env
    );
}

async function handleArtworkSessionCreate(request, env) {
    const body = await request.json().catch(() => ({}));
    const uploadId = normaliseArtworkUploadId(body.uploadId);

    if (!uploadId) {
        return jsonResponse(
            {
                success: false,
                message: "The artwork upload reference is invalid."
            },
            422,
            request,
            env
        );
    }

    const validChallenge = await verifyArtworkTurnstile(
        text(body.turnstileToken),
        request,
        env
    );

    if (!validChallenge) {
        return jsonResponse(
            {
                success: false,
                message: "Security verification failed. Please try again."
            },
            403,
            request,
            env
        );
    }

    const now = Math.floor(Date.now() / 1000);
    const sessionToken = await createArtworkSessionToken(
        {
            uploadId,
            product: text(body.product).slice(0, 50) || "tier-1",
            iat: now,
            exp: now + ARTWORK_SESSION_TTL_SECONDS
        },
        env.UPLOAD_SESSION_SECRET
    );

    return jsonResponse(
        {
            success: true,
            sessionToken,
            expiresIn: ARTWORK_SESSION_TTL_SECONDS
        },
        200,
        request,
        env
    );
}

async function handleArtworkFileUpload(request, env, url) {
    const authorization = request.headers.get("Authorization") || "";
    const token = authorization.startsWith("Bearer ")
        ? authorization.slice(7)
        : "";

    const session = await verifyArtworkSessionToken(
        token,
        env.UPLOAD_SESSION_SECRET
    );

    if (!session) {
        return jsonResponse(
            {
                success: false,
                message: "The upload session is invalid or has expired."
            },
            401,
            request,
            env
        );
    }

    const encodedSuffix = url.pathname.slice(ARTWORK_UPLOAD_PREFIX.length);
    let suffix = "";

    try {
        suffix = decodeURIComponent(encodedSuffix);
    } catch (_) {
        return jsonResponse(
            {
                success: false,
                message: "The artwork filename is invalid."
            },
            400,
            request,
            env
        );
    }

    const expectedUploadPrefix = `${session.uploadId}/`;

    if (
        !suffix.startsWith(expectedUploadPrefix) ||
        suffix.includes("..") ||
        suffix.includes("\\") ||
        suffix.startsWith("/")
    ) {
        return jsonResponse(
            {
                success: false,
                message: "The artwork storage path is invalid."
            },
            400,
            request,
            env
        );
    }

    const objectKey = `incoming/${suffix}`;
    const storedFilename = objectKey.split("/").pop() || "";
    const extension = getArtworkExtension(storedFilename);

    if (!ARTWORK_ALLOWED_EXTENSIONS.has(extension)) {
        return jsonResponse(
            {
                success: false,
                message: "This artwork file type is not supported."
            },
            415,
            request,
            env
        );
    }

    const contentLength = Number(
        request.headers.get("Content-Length") || "0"
    );

    if (!Number.isFinite(contentLength) || contentLength <= 0) {
        return jsonResponse(
            {
                success: false,
                message: "The uploaded artwork file is empty."
            },
            400,
            request,
            env
        );
    }

    if (contentLength > ARTWORK_MAX_FILE_BYTES) {
        return jsonResponse(
            {
                success: false,
                message: "The artwork file exceeds the 95 MB limit."
            },
            413,
            request,
            env
        );
    }

    const encodedOriginalName =
        request.headers.get("X-Luxsome-Original-Name") || "";
    let originalName = storedFilename;

    try {
        originalName = decodeURIComponent(encodedOriginalName) || storedFilename;
    } catch (_) {
        originalName = storedFilename;
    }

    await env.ARTWORK_BUCKET.put(objectKey, request.body, {
        httpMetadata: {
            contentType:
                request.headers.get("Content-Type") ||
                "application/octet-stream"
        },
        customMetadata: {
            originalName: originalName.slice(0, 255),
            uploadId: session.uploadId,
            product: text(session.product).slice(0, 50),
            uploadedAt: new Date().toISOString()
        }
    });

    return jsonResponse(
        {
            success: true,
            key: objectKey
        },
        201,
        request,
        env
    );
}

async function verifyArtworkTurnstile(token, request, env) {
    if (!token) return false;

    const form = new FormData();
    form.set("secret", env.TURNSTILE_SECRET_KEY);
    form.set("response", token);

    const remoteIp = request.headers.get("CF-Connecting-IP");
    if (remoteIp) form.set("remoteip", remoteIp);

    const response = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
            method: "POST",
            body: form
        }
    );

    if (!response.ok) return false;

    const result = await response.json().catch(() => ({}));

    return Boolean(
        result.success &&
        (!result.action || result.action === "artwork-upload")
    );
}

function normaliseArtworkUploadId(value) {
    const candidate = text(value);

    return /^[a-z0-9][a-z0-9-]{15,100}$/i.test(candidate)
        ? candidate
        : "";
}

function getArtworkExtension(filename) {
    const parts = String(filename || "").split(".");

    return parts.length > 1
        ? parts.pop().toLowerCase()
        : "";
}

function artworkBase64UrlEncode(bytes) {
    let binary = "";

    bytes.forEach(byte => {
        binary += String.fromCharCode(byte);
    });

    return btoa(binary)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/g, "");
}

function artworkBase64UrlDecode(value) {
    const padded = String(value || "")
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        .padEnd(Math.ceil(String(value || "").length / 4) * 4, "=");

    const binary = atob(padded);

    return Uint8Array.from(
        binary,
        character => character.charCodeAt(0)
    );
}

async function importArtworkHmacKey(secret) {
    return crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        {
            name: "HMAC",
            hash: "SHA-256"
        },
        false,
        ["sign", "verify"]
    );
}

async function createArtworkSessionToken(payload, secret) {
    const encodedPayload = artworkBase64UrlEncode(
        new TextEncoder().encode(JSON.stringify(payload))
    );
    const key = await importArtworkHmacKey(secret);
    const signature = await crypto.subtle.sign(
        "HMAC",
        key,
        new TextEncoder().encode(encodedPayload)
    );

    return `${encodedPayload}.${artworkBase64UrlEncode(
        new Uint8Array(signature)
    )}`;
}

async function verifyArtworkSessionToken(token, secret) {
    try {
        if (!token || !token.includes(".")) return null;

        const [encodedPayload, encodedSignature] = token.split(".", 2);
        const key = await importArtworkHmacKey(secret);
        const valid = await crypto.subtle.verify(
            "HMAC",
            key,
            artworkBase64UrlDecode(encodedSignature),
            new TextEncoder().encode(encodedPayload)
        );

        if (!valid) return null;

        const payload = JSON.parse(
            new TextDecoder().decode(
                artworkBase64UrlDecode(encodedPayload)
            )
        );

        if (!payload.exp || Date.now() >= Number(payload.exp) * 1000) {
            return null;
        }

        return payload;
    } catch (_) {
        return null;
    }
}

function handlePreflight(request, env) {
    const origin = normaliseOrigin(
        request.headers.get("Origin")
    );

    if (!isAllowedOrigin(origin, env)) {
        return new Response(null, {
            status: 403,
            headers: corsHeaders(origin)
        });
    }

    return new Response(null, {
        status: 204,
        headers: corsHeaders(origin)
    });
}

function normaliseOrigin(origin) {
    return String(origin || "")
        .trim()
        .replace(/\/$/, "");
}

function isAllowedOrigin(origin, env) {
    const normalisedOrigin = normaliseOrigin(origin);

    if (!normalisedOrigin) return true;

    const configuredOrigins = String(
        env.ALLOWED_ORIGIN || ""
    )
        .split(",")
        .map(normaliseOrigin)
        .filter(Boolean);

    const allowed = new Set([
        ...configuredOrigins,
        "https://luxsomepackaging.com",
        "https://www.luxsomepackaging.com"
    ]);

    return allowed.has(normalisedOrigin);
}

function corsHeaders(origin) {
    const normalisedOrigin =
        normaliseOrigin(origin) ||
        "https://www.luxsomepackaging.com";

    return {
        "Access-Control-Allow-Origin": normalisedOrigin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, OPTIONS",
        "Access-Control-Allow-Headers":
            "Content-Type, Accept, Authorization, X-Luxsome-Original-Name",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin"
    };
}

function jsonResponse(data, status, request, env) {
    const origin = request.headers.get("Origin");
    const headers = {
        "Content-Type": "application/json; charset=UTF-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
    };

    if (isAllowedOrigin(origin, env)) {
        Object.assign(headers, corsHeaders(origin));
    }

    return new Response(JSON.stringify(data), { status, headers });
}

async function safeJson(response) {
    try {
        return await response.json();
    } catch (_) {
        return null;
    }
}

function text(value) {
    if (Array.isArray(value)) return value.filter(Boolean).join(", ").trim();
    return String(value ?? "").trim().slice(0, 5000);
}

function list(value) {
    if (Array.isArray(value)) return value.map(text).filter(Boolean);
    return text(value) ? text(value).split(",").map((item) => item.trim()).filter(Boolean) : [];
}

function displayList(value, fallback) {
    const items = list(value);
    return items.length ? items.join(", ") : fallback;
}

function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 254;
}

function formatDate(value) {
    const raw = text(value);
    if (!raw) return "Not supplied";
    const date = new Date(`${raw}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return raw;
    return new Intl.DateTimeFormat("en-NG", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC"
    }).format(date);
}

function whatsappLink(phone) {
    let digits = text(phone).replace(/\D/g, "");
    if (digits.startsWith("0")) digits = `234${digits.slice(1)}`;
    return digits ? `https://wa.me/${digits}` : "https://wa.me/2349068804133";
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}

function tagValue(value) {
    return String(value).toLowerCase().replace(/[^a-z0-9_-]/g, "_").slice(0, 256);
}
