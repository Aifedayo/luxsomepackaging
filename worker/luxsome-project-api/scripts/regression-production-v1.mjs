#!/usr/bin/env node
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const argv = process.argv.slice(2);
const argValue = (name, fallback = "") => {
    const index = argv.indexOf(name);
    return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback;
};

const API_BASE = argValue(
    "--api",
    process.env.LUXSOME_API_BASE || "https://api-develop.luxsomepackaging.com"
).replace(/\/$/, "");

const TOKEN = argValue("--token", process.env.LUXSOME_ADMIN_TOKEN || "");
const WRITE_MODE = argv.includes("--write");
const ORDER_FILTER = argValue("--order", "");
const REPORT_DIR = resolve(argValue("--report-dir", "./reports"));
const TODAY = new Date().toISOString().slice(0, 10);

if (!TOKEN) {
    console.error("Missing administrator token.\n");
    console.error("Use either:");
    console.error("  LUXSOME_ADMIN_TOKEN='...' node scripts/regression-production-v1.mjs");
    console.error("or:");
    console.error("  node scripts/regression-production-v1.mjs --token '...'\n");
    console.error("In the CRM browser console you can retrieve it with:");
    console.error('  sessionStorage.getItem("luxsomeAdminToken")');
    process.exit(2);
}

mkdirSync(REPORT_DIR, { recursive: true });

const results = [];
let createdTask = null;

function row(id, area, title, status, expected, actual, severity = "Medium", notes = "") {
    results.push({ id, area, title, status, severity, expected, actual, notes });
    const icon = status === "PASS" ? "✓" : status === "FAIL" ? "✗" : status === "WARN" ? "!" : "-";
    console.log(`${icon} ${id} ${title} [${status}]`);
    if (status === "FAIL") console.log(`    Expected: ${expected}\n    Actual:   ${actual}`);
}

async function request(path, options = {}, token = TOKEN) {
    const headers = { ...(options.headers || {}) };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (options.body !== undefined && !headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
    }
    const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    const text = await response.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    return { status: response.status, ok: response.ok, body };
}

function asArray(value) { return Array.isArray(value) ? value : []; }
function orderRef(order) { return order?.order_reference || order?.orderReference || ""; }

const expectedTemplates = [
    "Rigid Box Production",
    "Hang Tag Production",
    "Branded Tissue Production",
    "Thank You Card / Envelope Production",
    "Shopping Bag Production",
    "Sticker Production",
    "Tier 1 Packaging System",
    "Tier 2 Packaging System",
    "Tier 3 Packaging System",
    "Bespoke Packaging System"
];

const knownItemExpectations = [
    { re: /tier\s*1|foundation\s+(packaging\s+)?system/i, template: /Tier 1 Packaging System/i },
    { re: /tier\s*2|signature\s+(packaging\s+)?system/i, template: /Tier 2 Packaging System/i },
    { re: /tier\s*3|prestige\s+(packaging\s+)?system/i, template: /Tier 3 Packaging System/i },
    { re: /bespoke|custom packaging/i, template: /Bespoke Packaging System/i },
    { re: /rigid box|magnetic flap|shoulder box|gate box|collapsible rigid|tray[- ]in[- ]bed|door style box/i, template: /Rigid Box Production/i },
    { re: /hang tag|swing tag|clothing tag|single piece tag|2 piece tag|two piece tag|3 piece tag|three piece tag/i, template: /Hang Tag Production/i },
    { re: /branded tissue|tissue paper|wrapping tissue/i, template: /Branded Tissue Production/i },
    { re: /thank[- ]?you (card|note)|envelope/i, template: /Thank You Card \/ Envelope Production/i },
    { re: /shopping bag|paper bag|carrier bag|branded bag/i, template: /Shopping Bag Production/i },
    { re: /sticker seal|branded sticker|thank[- ]?you sticker|sticker/i, template: /Sticker Production/i }
];

function expectationFor(description = "") {
    return knownItemExpectations.find(item => item.re.test(description)) || null;
}

async function main() {
    console.log("Luxsome Production v1 Regression\n===============================");
    console.log(`API: ${API_BASE}`);
    console.log(`Mode: ${WRITE_MODE ? "WRITE (temporary task CRUD enabled)" : "SAFE / READ-ONLY"}`);
    if (ORDER_FILTER) console.log(`Order filter: ${ORDER_FILTER}`);
    console.log("");

    // Health
    try {
        const r = await request("/health", {}, "");
        row("PV1-001", "API", "Health endpoint", r.status === 200 && r.body?.success === true ? "PASS" : "FAIL", "HTTP 200 and success=true", `HTTP ${r.status}, ${JSON.stringify(r.body)}`, "Critical");
    } catch (e) {
        row("PV1-001", "API", "Health endpoint", "FAIL", "Reachable API", e.message, "Critical");
    }

    // Unauthorized admin access
    try {
        const r = await request("/admin/production-templates", {}, "definitely-invalid-token");
        row("PV1-002", "Security", "Invalid admin token rejected", r.status === 401 ? "PASS" : "FAIL", "HTTP 401", `HTTP ${r.status}`, "Critical");
    } catch (e) {
        row("PV1-002", "Security", "Invalid admin token rejected", "FAIL", "HTTP 401", e.message, "Critical");
    }

    // Template library
    let templates = [];
    try {
        const r = await request("/admin/production-templates");
        templates = asArray(r.body?.templates);
        row("PV1-003", "Templates", "Template list loads", r.status === 200 && r.body?.success === true ? "PASS" : "FAIL", "HTTP 200 with templates array", `HTTP ${r.status}, count=${templates.length}`, "Critical");

        for (const name of expectedTemplates) {
            const found = templates.find(t => t.name === name && t.isActive === true);
            row(`PV1-T-${expectedTemplates.indexOf(name)+1}`, "Templates", `${name} seeded and active`, found ? "PASS" : "FAIL", "Active template exists", found ? `id=${found.id}, steps=${found.stepCount}` : "Not found/active", "High");
        }
    } catch (e) {
        row("PV1-003", "Templates", "Template list loads", "FAIL", "Templates endpoint succeeds", e.message, "Critical");
    }

    // Template detail integrity
    for (const template of templates.filter(t => expectedTemplates.includes(t.name))) {
        try {
            const r = await request(`/admin/production-templates/${template.id}`);
            const t = r.body?.template;
            const steps = asArray(t?.steps);
            const rules = asArray(t?.rules);
            const ids = new Set(steps.map(s => Number(s.id)));
            const badDependency = steps.find(s => s.dependencyStepId && !ids.has(Number(s.dependencyStepId)));
            const badDuration = steps.find(s => Number(s.defaultDurationDays || 0) < 1);
            const good = r.status === 200 && steps.length > 0 && rules.length > 0 && !badDependency && !badDuration;
            row(`PV1-D-${template.id}`, "Templates", `${template.name} detail integrity`, good ? "PASS" : "FAIL", "At least 1 step/rule; valid dependencies/durations", `steps=${steps.length}, rules=${rules.length}${badDependency ? ", invalid dependency" : ""}${badDuration ? ", invalid duration" : ""}`, "High");
        } catch (e) {
            row(`PV1-D-${template.id}`, "Templates", `${template.name} detail integrity`, "FAIL", "Valid template detail", e.message, "High");
        }
    }

    // Active orders
    let orders = [];
    try {
        const r = await request("/admin/orders?view=active&limit=100");
        orders = asArray(r.body?.orders);
        if (ORDER_FILTER) orders = orders.filter(o => orderRef(o) === ORDER_FILTER);
        row("PV1-020", "Orders", "Active orders load", r.status === 200 ? "PASS" : "FAIL", "HTTP 200", `HTTP ${r.status}, test orders=${orders.length}`, "Critical");
    } catch (e) {
        row("PV1-020", "Orders", "Active orders load", "FAIL", "Active orders endpoint succeeds", e.message, "Critical");
    }

    if (!orders.length) {
        row("PV1-021", "Orders", "At least one order available for regression", "WARN", "One active order", "No active order found (or --order did not match)", "Medium", "Create/keep a develop test order to exercise preview tests.");
    }

    let duplicateCandidate = null;

    for (const order of orders.slice(0, 20)) {
        const ref = orderRef(order);
        if (!ref) continue;
        let detail = null;
        try {
            const r = await request(`/admin/orders/${encodeURIComponent(ref)}`);
            detail = r.body?.order;
            const items = asArray(detail?.items);
            row(`PV1-O-${ref}`, "Orders", `${ref} detail and items load`, r.status === 200 && detail ? "PASS" : "FAIL", "Order detail with items array", `HTTP ${r.status}, items=${items.length}`, "High");

            // Full order preview
            const full = await request(`/admin/orders/${encodeURIComponent(ref)}/full-schedule-preview`, {
                method: "POST",
                body: JSON.stringify({ startDate: TODAY })
            });
            const countConsistent = full.status === 200 && Number(full.body?.itemCount || 0) === items.length;
            row(`PV1-FP-${ref}`, "Generation", `${ref} full-order preview`, countConsistent ? "PASS" : "FAIL", `HTTP 200 and itemCount=${items.length}`, `HTTP ${full.status}, itemCount=${full.body?.itemCount}`, "Critical");

            // Single item previews and matching expectations
            for (const item of items) {
                const description = String(item.description || "");
                const expected = expectationFor(description);
                const p = await request(`/admin/orders/${encodeURIComponent(ref)}/schedule-preview`, {
                    method: "POST",
                    body: JSON.stringify({ orderItemId: item.id, startDate: TODAY })
                });

                if (expected) {
                    const actualName = p.body?.template?.name || "";
                    const pass = p.status === 200 && expected.template.test(actualName) && Number(p.body?.taskCount || 0) > 0;
                    row(`PV1-M-${ref}-${item.id}`, "Matching", `${description} matches expected template`, pass ? "PASS" : "FAIL", `${expected.template} and taskCount>0`, `HTTP ${p.status}, template=${actualName || "none"}, tasks=${p.body?.taskCount ?? 0}`, "Critical");
                } else if (p.status === 200) {
                    row(`PV1-M-${ref}-${item.id}`, "Matching", `${description} has a production template`, "PASS", "Template match or explicit accepted gap", `template=${p.body?.template?.name || "unknown"}`, "Medium");
                } else if (p.status === 404) {
                    row(`PV1-M-${ref}-${item.id}`, "Matching", `${description} has no known baseline mapping`, "WARN", "Review whether this product needs a v1 template", p.body?.message || "No template", "Medium");
                } else {
                    row(`PV1-M-${ref}-${item.id}`, "Matching", `${description} preview request`, "FAIL", "HTTP 200 or intentional 404 no-template", `HTTP ${p.status}: ${p.body?.message || JSON.stringify(p.body)}`, "High");
                }

                if (p.status === 200 && p.body?.alreadyScheduled && !duplicateCandidate) {
                    duplicateCandidate = { ref, item };
                }
            }
        } catch (e) {
            row(`PV1-O-${ref}`, "Orders", `${ref} regression flow`, "FAIL", "Order/detail/preview requests complete", e.message, "Critical");
        }
    }

    // Invalid order and item validation
    try {
        const r = await request("/admin/orders/ORD-9999-9999/schedule-preview", {
            method: "POST",
            body: JSON.stringify({ orderItemId: 1, startDate: TODAY })
        });
        row("PV1-040", "Validation", "Unknown order rejected", r.status === 404 ? "PASS" : "FAIL", "HTTP 404", `HTTP ${r.status}`, "High");
    } catch (e) {
        row("PV1-040", "Validation", "Unknown order rejected", "FAIL", "HTTP 404", e.message, "High");
    }

    if (orders[0]) {
        const ref = orderRef(orders[0]);
        try {
            const r = await request(`/admin/orders/${encodeURIComponent(ref)}/schedule-preview`, {
                method: "POST",
                body: JSON.stringify({ orderItemId: 999999999, startDate: TODAY })
            });
            row("PV1-041", "Validation", "Foreign/unknown order item rejected", r.status === 422 ? "PASS" : "FAIL", "HTTP 422", `HTTP ${r.status}`, "High");
        } catch (e) {
            row("PV1-041", "Validation", "Foreign/unknown order item rejected", "FAIL", "HTTP 422", e.message, "High");
        }
    }

    // Duplicate generation protection: request should not mutate because it should return 409.
    if (duplicateCandidate) {
        const { ref, item } = duplicateCandidate;
        try {
            const r = await request(`/admin/orders/${encodeURIComponent(ref)}/generate-schedule`, {
                method: "POST",
                body: JSON.stringify({ orderItemId: item.id, startDate: TODAY })
            });
            row("PV1-050", "Safety", "Duplicate generated schedule is blocked", r.status === 409 ? "PASS" : "FAIL", "HTTP 409 and no duplicate tasks", `HTTP ${r.status}: ${r.body?.message || ""}`, "Critical");
        } catch (e) {
            row("PV1-050", "Safety", "Duplicate generated schedule is blocked", "FAIL", "HTTP 409", e.message, "Critical");
        }
    } else {
        row("PV1-050", "Safety", "Duplicate generated schedule is blocked", "WARN", "Existing scheduled item available for test", "No already-scheduled item found; test skipped", "High");
    }

    // Production schedule list
    try {
        const r = await request("/admin/production-schedule");
        row("PV1-060", "Gantt API", "Production schedule list loads", r.status === 200 && Array.isArray(r.body?.tasks) ? "PASS" : "FAIL", "HTTP 200 and tasks array", `HTTP ${r.status}, tasks=${asArray(r.body?.tasks).length}`, "Critical");
    } catch (e) {
        row("PV1-060", "Gantt API", "Production schedule list loads", "FAIL", "Schedule endpoint succeeds", e.message, "Critical");
    }

    // Optional write-mode task CRUD. Creates a temporary general task and deletes it at end.
    if (WRITE_MODE && orders[0]) {
        const ref = orderRef(orders[0]);
        const uniqueName = `REGRESSION TEMP ${Date.now()}`;
        try {
            const create = await request(`/admin/orders/${encodeURIComponent(ref)}/schedule`, {
                method: "POST",
                body: JSON.stringify({
                    taskName: uniqueName,
                    status: "not_started",
                    priority: "normal",
                    plannedStartDate: TODAY,
                    plannedEndDate: TODAY,
                    progress: 0,
                    notes: "Temporary automated Production v1 regression task"
                })
            });
            createdTask = create.body?.task || null;
            row("PV1-070", "Task CRUD", "Temporary task create", create.status === 201 && createdTask?.id ? "PASS" : "FAIL", "HTTP 201 with task id", `HTTP ${create.status}, taskId=${createdTask?.id || "none"}`, "Critical");

            if (createdTask?.id) {
                const update = await request(`/admin/orders/${encodeURIComponent(ref)}/schedule/${createdTask.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ taskName: `${uniqueName} UPDATED`, status: "in_progress", progress: 40, priority: "high" })
                });
                row("PV1-071", "Task CRUD", "Temporary task update", update.status === 200 ? "PASS" : "FAIL", "HTTP 200", `HTTP ${update.status}`, "Critical");

                const selfDep = await request(`/admin/orders/${encodeURIComponent(ref)}/schedule/${createdTask.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ dependencyTaskId: createdTask.id })
                });
                row("PV1-072", "Dependencies", "Self-dependency rejected", selfDep.status === 422 ? "PASS" : "FAIL", "HTTP 422", `HTTP ${selfDep.status}`, "Critical");

                const badDates = await request(`/admin/orders/${encodeURIComponent(ref)}/schedule/${createdTask.id}`, {
                    method: "PATCH",
                    body: JSON.stringify({ plannedStartDate: "2026-08-20", plannedEndDate: "2026-08-19" })
                });
                row("PV1-073", "Validation", "End date before start date rejected", badDates.status === 422 ? "PASS" : "FAIL", "HTTP 422", `HTTP ${badDates.status}`, "High");

                const del = await request(`/admin/orders/${encodeURIComponent(ref)}/schedule/${createdTask.id}`, { method: "DELETE" });
                row("PV1-074", "Task CRUD", "Temporary task delete", del.status === 200 ? "PASS" : "FAIL", "HTTP 200", `HTTP ${del.status}`, "Critical");
                createdTask = null;
            }
        } catch (e) {
            row("PV1-070", "Task CRUD", "Temporary task CRUD flow", "FAIL", "Create/update/delete temporary task", e.message, "Critical");
        } finally {
            if (createdTask?.id) {
                try {
                    await request(`/admin/orders/${encodeURIComponent(ref)}/schedule/${createdTask.id}`, { method: "DELETE" });
                    console.log(`Cleanup: deleted temporary task ${createdTask.id}`);
                } catch (e) {
                    console.error(`Cleanup warning: could not delete temporary task ${createdTask.id}: ${e.message}`);
                }
            }
        }
    } else {
        row("PV1-070", "Task CRUD", "Temporary task CRUD suite", "SKIP", "Run with --write to enable", "Safe mode", "Medium");
    }

    const summary = results.reduce((acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
    }, {});

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const jsonPath = resolve(REPORT_DIR, `production-v1-regression-${timestamp}.json`);
    const tsvPath = resolve(REPORT_DIR, `production-v1-regression-${timestamp}.tsv`);
    writeFileSync(jsonPath, JSON.stringify({ apiBase: API_BASE, writeMode: WRITE_MODE, generatedAt: new Date().toISOString(), summary, results }, null, 2));

    const headers = ["Test ID","Area","Title","Status","Severity","Expected","Actual","Notes"];
    const esc = v => String(v ?? "").replaceAll("\t", " ").replaceAll("\n", " ");
    const lines = [headers.join("\t"), ...results.map(r => [r.id,r.area,r.title,r.status,r.severity,r.expected,r.actual,r.notes].map(esc).join("\t"))];
    writeFileSync(tsvPath, lines.join("\n") + "\n");

    console.log("\nSummary\n-------");
    console.log(`PASS: ${summary.PASS || 0}`);
    console.log(`FAIL: ${summary.FAIL || 0}`);
    console.log(`WARN: ${summary.WARN || 0}`);
    console.log(`SKIP: ${summary.SKIP || 0}`);
    console.log(`\nJSON: ${jsonPath}`);
    console.log(`TSV:  ${tsvPath}`);

    if ((summary.FAIL || 0) > 0) process.exitCode = 1;
}

main().catch(error => {
    console.error("Fatal regression runner error:", error);
    process.exit(1);
});
