"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const resolveApiBase = () => {
        if (window.LUXSOME_ENV?.apiBase) return window.LUXSOME_ENV.apiBase;
        const host = window.location.hostname;
        if (host === "develop.luxsomepackaging.com") return "https://api-develop.luxsomepackaging.com";
        if (host === "staging.luxsomepackaging.com") return "https://api-staging.luxsomepackaging.com";
        if (host === "luxsomepackaging.com" || host === "www.luxsomepackaging.com") return "https://api.luxsomepackaging.com";
        return "https://api-develop.luxsomepackaging.com";
    };

    const API_BASE = resolveApiBase();

    const state = {
        categories: [],
        items: [],
        overview: null,
        movements: [],
        activeTab: "overview",
        modalMode: null,
        modalItem: null,
        drawerItemId: null
    };

    const $ = id => document.getElementById(id);

    const els = {
        tabs: [...document.querySelectorAll("[data-inventory-tab]")],
        panels: [...document.querySelectorAll("[data-inventory-panel]")],
        metricTotalItems: $("metricTotalItems"),
        metricLowStock: $("metricLowStock"),
        metricOutOfStock: $("metricOutOfStock"),
        metricReserved: $("metricReserved"),
        metricStockValue: $("metricStockValue"),
        inventoryAlertList: $("inventoryAlertList"),
        recentMovementList: $("recentMovementList"),
        inventorySearch: $("inventorySearch"),
        inventoryCategoryFilter: $("inventoryCategoryFilter"),
        inventoryStatusFilter: $("inventoryStatusFilter"),
        inventoryItemsTableBody: $("inventoryItemsTableBody"),
        inventoryMovementsTableBody: $("inventoryMovementsTableBody"),
        refreshInventoryButton: $("refreshInventoryButton"),
        addInventoryItemButton: $("addInventoryItemButton"),
        drawer: $("inventoryDrawer"),
        drawerBackdrop: $("inventoryDrawerBackdrop"),
        drawerTitle: $("inventoryDrawerTitle"),
        drawerEyebrow: $("inventoryDrawerEyebrow"),
        drawerBody: $("inventoryDrawerBody"),
        closeDrawerButton: $("closeInventoryDrawerButton"),
        modal: $("inventoryModal"),
        modalForm: $("inventoryModalForm"),
        modalTitle: $("inventoryModalTitle"),
        modalEyebrow: $("inventoryModalEyebrow"),
        modalBody: $("inventoryModalBody"),
        closeModalButton: $("closeInventoryModalButton"),
        cancelModalButton: $("cancelInventoryModalButton"),
        saveModalButton: $("saveInventoryModalButton"),
        toast: $("inventoryToast")
    };

    const adminToken = () =>
        localStorage.getItem("luxsomeAdminToken") ||
        sessionStorage.getItem("luxsomeAdminToken") ||
        "";

    const api = async (path, options = {}) => {
        const headers = new Headers(options.headers || {});
        headers.set("Content-Type", "application/json");
        const token = adminToken();
        if (token) headers.set("Authorization", `Bearer ${token}`);

        const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
            throw new Error(data?.message || data?.error || `Request failed with status ${response.status}.`);
        }
        return data;
    };

    const money = value => new Intl.NumberFormat("en-NG", {
        style: "currency", currency: "NGN", maximumFractionDigits: 2
    }).format(Number(value || 0));

    const number = value => new Intl.NumberFormat("en-NG", {
        maximumFractionDigits: 2
    }).format(Number(value || 0));

    const dateTime = value => {
        if (!value) return "—";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return new Intl.DateTimeFormat("en-NG", {
            dateStyle: "medium", timeStyle: "short"
        }).format(date);
    };

    const escapeHtml = value => String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

    const statusLabel = status => ({
        in_stock: "In stock",
        low_stock: "Low stock",
        out_of_stock: "Out of stock"
    }[status] || status || "—");

    const movementLabel = type => ({
        stock_in: "Stock in",
        stock_out: "Stock out",
        adjustment_in: "Adjustment in",
        adjustment_out: "Adjustment out",
        production_usage: "Production usage",
        return_to_stock: "Return to stock"
    }[type] || type || "—");

    const movementDirection = type =>
        ["stock_in", "adjustment_in", "return_to_stock"].includes(type) ? "+" : "-";

    const generateSku = itemName => {
        const raw = String(itemName || "").trim();
        if (!raw) return "";

        return raw
            .toUpperCase()
            .replace(/GREYBOARD|GRAYBOARD/g, "GRB")
            .replace(/GROSGRAIN/g, "GRG")
            .replace(/RIBBON/g, "RIB")
            .replace(/TISSUE/g, "TIS")
            .replace(/PAPER/g, "PAP")
            .replace(/MAGNET(?:IC)?/g, "MAG")
            .replace(/DOUBLE[\s-]*SIDED\s*TAPE/g, "TAPE-DS")
            .replace(/[^A-Z0-9.]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .replace(/-+/g, "-")
            .split("-")
            .filter(Boolean)
            .map(part => {
                if (/^\d+(?:\.\d+)?(?:MM)?$/.test(part)) return part;
                return part.length <= 4 ? part : part.slice(0, 4);
            })
            .join("-")
            .slice(0, 32);
    };

    const bindSkuAutogeneration = () => {
        const nameInput = els.modalBody.querySelector('[name="name"]');
        const skuInput = els.modalBody.querySelector('[name="sku"]');
        if (!nameInput || !skuInput) return;

        let manuallyEdited = false;

        skuInput.addEventListener("input", () => {
            manuallyEdited =
                skuInput.value.trim() !== "" &&
                skuInput.value.trim() !== generateSku(nameInput.value);
        });

        nameInput.addEventListener("input", () => {
            if (!manuallyEdited || !skuInput.value.trim()) {
                skuInput.value = generateSku(nameInput.value);
            }
        });

        skuInput.addEventListener("blur", () => {
            if (!skuInput.value.trim()) {
                skuInput.value = generateSku(nameInput.value);
                manuallyEdited = false;
            }
        });
    };

    const toast = (message, { error = false } = {}) => {
        els.toast.textContent = message;
        els.toast.hidden = false;
        els.toast.classList.toggle("is-error", error);
        clearTimeout(toast.timer);
        toast.timer = setTimeout(() => { els.toast.hidden = true; }, 3200);
    };

    const setBusy = (button, busy, label = "Working...") => {
        if (!button) return;
        if (busy) {
            button.dataset.originalText = button.textContent;
            button.textContent = label;
            button.disabled = true;
        } else {
            button.textContent = button.dataset.originalText || button.textContent;
            button.disabled = false;
        }
    };

    const setTab = tab => {
        state.activeTab = tab;
        els.tabs.forEach(button => {
            const active = button.dataset.inventoryTab === tab;
            button.classList.toggle("is-active", active);
            button.setAttribute("aria-selected", String(active));
        });
        els.panels.forEach(panel => {
            const active = panel.dataset.inventoryPanel === tab;
            panel.classList.toggle("is-active", active);
            panel.hidden = !active;
        });
        if (tab === "materials") loadItems().catch(e => toast(e.message, {error:true}));
        if (tab === "movements") loadMovements().catch(e => toast(e.message, {error:true}));
    };

    const renderOverview = () => {
        const o = state.overview || {};
        els.metricTotalItems.textContent = number(o.totalItems || 0);
        els.metricLowStock.textContent = number(o.lowStockCount || 0);
        els.metricOutOfStock.textContent = number(o.outOfStockCount || 0);
        els.metricReserved.textContent = number(o.totalReserved || 0);
        els.metricStockValue.textContent = money(o.totalStockValue || 0);

        const alertItems = [...(o.outOfStockItems || []), ...(o.lowStockItems || [])];
        els.inventoryAlertList.innerHTML = alertItems.length
            ? alertItems.map(item => `
                <button type="button" class="inventory-alert-row" data-view-item="${item.id}" style="width:100%;border:0;background:transparent;text-align:left;cursor:pointer;">
                    <div>
                        <strong>${escapeHtml(item.name)}</strong>
                        <small>${escapeHtml(item.sku)} · Available ${number(item.quantityAvailable)} ${escapeHtml(item.unit)} · Reorder at ${number(item.reorderLevel)}</small>
                    </div>
                    <span class="inventory-status inventory-status--${escapeHtml(item.status)}">${escapeHtml(statusLabel(item.status))}</span>
                </button>
            `).join("")
            : `<p class="inventory-empty">No low-stock items.</p>`;

        els.recentMovementList.innerHTML = (o.recentMovements || []).length
            ? o.recentMovements.map(m => `
                <div class="inventory-movement-row">
                    <div><strong>${escapeHtml(m.item_name || "Inventory item")}</strong><small>${escapeHtml(movementLabel(m.movement_type))} · ${escapeHtml(dateTime(m.created_at))}</small></div>
                    <strong>${movementDirection(m.movement_type)} ${number(m.quantity)} ${escapeHtml(m.item_unit || "")}</strong>
                </div>
            `).join("")
            : `<p class="inventory-empty">No stock movements yet.</p>`;
    };

    const renderCategoryFilter = () => {
        const current = els.inventoryCategoryFilter.value;
        els.inventoryCategoryFilter.innerHTML = `<option value="">All categories</option>` +
            state.categories.map(c => `<option value="${escapeHtml(c.slug)}">${escapeHtml(c.name)}</option>`).join("");
        els.inventoryCategoryFilter.value = current;
    };

    const renderItems = () => {
        if (!state.items.length) {
            els.inventoryItemsTableBody.innerHTML = `<tr><td colspan="8" class="inventory-empty-cell">No inventory items found.</td></tr>`;
            return;
        }

        els.inventoryItemsTableBody.innerHTML = state.items.map(item => `
            <tr>
                <td><div class="inventory-item-name"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.sku)}</small></div></td>
                <td>${escapeHtml(item.categoryName || "—")}</td>
                <td>${number(item.quantityOnHand)} ${escapeHtml(item.unit)}</td>
                <td>${number(item.quantityReserved)} ${escapeHtml(item.unit)}</td>
                <td><strong>${number(item.quantityAvailable)} ${escapeHtml(item.unit)}</strong></td>
                <td>${number(item.reorderLevel)} ${escapeHtml(item.unit)}</td>
                <td><span class="inventory-status inventory-status--${escapeHtml(item.status)}">${escapeHtml(statusLabel(item.status))}</span></td>
                <td>
                    <div class="inventory-actions">
                        <button type="button" class="inventory-action-button" data-view-item="${item.id}">View</button>
                        <button type="button" class="inventory-action-button" data-stock-in="${item.id}">Stock in</button>
                        <button type="button" class="inventory-action-button" data-stock-out="${item.id}">Stock out</button>
                        <button type="button" class="inventory-action-button" data-adjust-item="${item.id}">Adjust</button>
                    </div>
                </td>
            </tr>
        `).join("");
    };

    const renderMovements = () => {
        if (!state.movements.length) {
            els.inventoryMovementsTableBody.innerHTML = `<tr><td colspan="8" class="inventory-empty-cell">No stock movements found.</td></tr>`;
            return;
        }

        els.inventoryMovementsTableBody.innerHTML = state.movements.map(m => `
            <tr>
                <td>${escapeHtml(dateTime(m.created_at))}</td>
                <td><div class="inventory-item-name"><strong>${escapeHtml(m.item_name || "—")}</strong><small>${escapeHtml(m.item_sku || "")}</small></div></td>
                <td>${escapeHtml(movementLabel(m.movement_type))}</td>
                <td>${movementDirection(m.movement_type)} ${number(m.quantity)} ${escapeHtml(m.item_unit || "")}</td>
                <td>${number(m.quantity_before)}</td>
                <td>${number(m.quantity_after)}</td>
                <td>${escapeHtml(m.order_reference || "—")}</td>
                <td>${escapeHtml(m.reason || m.reference || "—")}</td>
            </tr>
        `).join("");
    };

    const loadOverview = async () => {
        const data = await api("/admin/inventory/overview");
        state.overview = data.overview || {};
        renderOverview();
    };

    const loadCategories = async () => {
        const data = await api("/admin/inventory/categories");
        state.categories = data.categories || [];
        renderCategoryFilter();
    };

    const loadItems = async () => {
        const params = new URLSearchParams();
        const search = els.inventorySearch.value.trim();
        const category = els.inventoryCategoryFilter.value;
        const status = els.inventoryStatusFilter.value;
        if (search) params.set("search", search);
        if (category) params.set("category", category);
        if (status) params.set("status", status);
        const query = params.toString() ? `?${params}` : "";
        const data = await api(`/admin/inventory/items${query}`);
        state.items = data.items || [];
        renderItems();
    };

    const loadMovements = async () => {
        const data = await api("/admin/inventory/movements?limit=100");
        state.movements = data.movements || [];
        renderMovements();
    };

    const refreshAll = async () => {
        setBusy(els.refreshInventoryButton, true, "Refreshing...");
        try {
            await Promise.all([loadOverview(), loadCategories()]);
            if (state.activeTab === "materials") await loadItems();
            if (state.activeTab === "movements") await loadMovements();
        } catch (error) {
            toast(error.message, { error: true });
        } finally {
            setBusy(els.refreshInventoryButton, false);
        }
    };

    const closeDrawer = () => {
        els.drawer.classList.remove("is-open");
        els.drawer.setAttribute("aria-hidden", "true");
        els.drawerBackdrop.hidden = true;
        state.drawerItemId = null;
    };

    const openDrawer = async itemId => {
        state.drawerItemId = Number(itemId);
        els.drawerBackdrop.hidden = false;
        els.drawer.classList.add("is-open");
        els.drawer.setAttribute("aria-hidden", "false");
        els.drawerTitle.textContent = "Loading...";
        els.drawerBody.innerHTML = `<p class="inventory-empty">Loading item...</p>`;

        try {
            const data = await api(`/admin/inventory/items/${itemId}`);
            const item = data.item;
            els.drawerEyebrow.textContent = item.sku || "Inventory item";
            els.drawerTitle.textContent = item.name;
            els.drawerBody.innerHTML = `
                <div class="inventory-detail-metrics">
                    <article class="inventory-detail-metric"><span>On hand</span><strong>${number(item.quantityOnHand)} ${escapeHtml(item.unit)}</strong></article>
                    <article class="inventory-detail-metric"><span>Reserved</span><strong>${number(item.quantityReserved)} ${escapeHtml(item.unit)}</strong></article>
                    <article class="inventory-detail-metric"><span>Available</span><strong>${number(item.quantityAvailable)} ${escapeHtml(item.unit)}</strong></article>
                </div>
                <span class="inventory-status inventory-status--${escapeHtml(item.status)}">${escapeHtml(statusLabel(item.status))}</span>
                <dl class="inventory-detail-list">
                    <div><dt>Category</dt><dd>${escapeHtml(item.categoryName || "—")}</dd></div>
                    <div><dt>Reorder level</dt><dd>${number(item.reorderLevel)} ${escapeHtml(item.unit)}</dd></div>
                    <div><dt>Unit cost</dt><dd>${money(item.unitCost)}</dd></div>
                    <div><dt>Stock value</dt><dd>${money(item.stockValue)}</dd></div>
                    <div><dt>Supplier</dt><dd>${escapeHtml(item.supplierName || "—")}</dd></div>
                    <div><dt>Storage location</dt><dd>${escapeHtml(item.storageLocation || "—")}</dd></div>
                </dl>
                <div class="inventory-actions" style="justify-content:flex-start;margin-bottom:18px;">
                    <button type="button" class="inventory-action-button" data-edit-item="${item.id}">Edit item</button>
                    <button type="button" class="inventory-action-button" data-stock-in="${item.id}">Stock in</button>
                    <button type="button" class="inventory-action-button" data-stock-out="${item.id}">Stock out</button>
                    <button type="button" class="inventory-action-button" data-adjust-item="${item.id}">Adjust</button>
                </div>
                <div class="inventory-card">
                    <div class="inventory-card__header"><div><p class="inventory-card__eyebrow">Recent activity</p><h2>Movements</h2></div></div>
                    <div class="inventory-movement-list">
                        ${(data.movements || []).length ? data.movements.slice(0,12).map(m => `
                            <div class="inventory-movement-row">
                                <div><strong>${escapeHtml(movementLabel(m.movement_type))}</strong><small>${escapeHtml(dateTime(m.created_at))}${m.reason ? ` · ${escapeHtml(m.reason)}` : ""}</small></div>
                                <strong>${movementDirection(m.movement_type)} ${number(m.quantity)} ${escapeHtml(item.unit)}</strong>
                            </div>
                        `).join("") : `<p class="inventory-empty">No movements yet.</p>`}
                    </div>
                </div>
            `;
        } catch (error) {
            els.drawerTitle.textContent = "Inventory item";
            els.drawerBody.innerHTML = `<p class="inventory-empty">${escapeHtml(error.message)}</p>`;
        }
    };

    const closeModal = () => {
        if (els.modal.open) els.modal.close();
        state.modalMode = null;
        state.modalItem = null;
        els.modalBody.innerHTML = "";
    };

    const categoryOptions = selectedId =>
        state.categories.map(c => `<option value="${c.id}" ${Number(selectedId)===Number(c.id)?"selected":""}>${escapeHtml(c.name)}</option>`).join("");

    const openAddItemModal = () => {
        state.modalMode = "add-item";
        state.modalItem = null;
        els.modalEyebrow.textContent = "Inventory";
        els.modalTitle.textContent = "Add inventory item";
        els.saveModalButton.textContent = "Create item";
        els.modalBody.innerHTML = `
            <label class="inventory-field">
                <span>Item name *</span>
                <input name="name" required placeholder="e.g. Greyboard 2.5mm">
                <small class="inventory-field__help">Use the name you normally use for this material.</small>
            </label>

            <label class="inventory-field">
                <span>SKU *</span>
                <input name="sku" required placeholder="Generated from item name">
                <small class="inventory-field__help">Generated automatically. You can still edit it before creating the item.</small>
            </label>

            <label class="inventory-field">
                <span>Category *</span>
                <select name="categoryId" required>
                    <option value="">Select category</option>
                    ${categoryOptions()}
                </select>
                <small class="inventory-field__help">Groups similar materials together for filtering and reporting.</small>
            </label>

            <label class="inventory-field">
                <span>Unit *</span>
                <select name="unit" required>
                    <option value="sheets">Sheets</option>
                    <option value="pieces">Pieces</option>
                    <option value="metres">Metres</option>
                    <option value="rolls">Rolls</option>
                    <option value="packs">Packs</option>
                    <option value="bottles">Bottles</option>
                    <option value="kilograms">Kilograms</option>
                    <option value="litres">Litres</option>
                </select>
                <small class="inventory-field__help">How this material is counted in stock.</small>
            </label>

            <label class="inventory-field">
                <span>Opening quantity</span>
                <input name="quantityOnHand" type="number" min="0" step="0.01" value="0">
                <small class="inventory-field__help">The physical quantity you have right now.</small>
            </label>

            <label class="inventory-field">
                <span>Reorder level</span>
                <input name="reorderLevel" type="number" min="0" step="0.01" value="0">
                <small class="inventory-field__help">At or below this quantity, the item is treated as low stock.</small>
            </label>

            <label class="inventory-field">
                <span>Unit cost (₦)</span>
                <input name="unitCost" type="number" min="0" step="0.01" value="0">
                <small class="inventory-field__help">Cost of one selected unit; used to calculate inventory value.</small>
            </label>

            <label class="inventory-field">
                <span>Supplier</span>
                <input name="supplierName" placeholder="Preferred supplier">
                <small class="inventory-field__help">Optional supplier or source for this material.</small>
            </label>

            <label class="inventory-field inventory-field--full">
                <span>Storage location</span>
                <input name="storageLocation" placeholder="e.g. Material Rack A">
                <small class="inventory-field__help">Optional physical location so staff can find the material quickly.</small>
            </label>

            <label class="inventory-field inventory-field--full">
                <span>Description</span>
                <textarea name="description" placeholder="Optional notes about this material"></textarea>
                <small class="inventory-field__help">Optional specifications, colour, thickness, size or other useful notes.</small>
            </label>
        `;
        bindSkuAutogeneration();
        els.modal.showModal();
    };

    const openEditItemModal = async itemId => {
        try {
            const data = await api(`/admin/inventory/items/${itemId}`);
            const item = data.item;
            state.modalMode = "edit-item";
            state.modalItem = item;
            els.modalEyebrow.textContent = item.sku;
            els.modalTitle.textContent = `Edit ${item.name}`;
            els.saveModalButton.textContent = "Save changes";
            els.modalBody.innerHTML = `
                <label class="inventory-field"><span>Item name</span><input name="name" required value="${escapeHtml(item.name)}"></label>
                <label class="inventory-field"><span>Category</span><select name="categoryId"><option value="">No category</option>${categoryOptions(item.categoryId)}</select></label>
                <label class="inventory-field"><span>Unit</span><input name="unit" required value="${escapeHtml(item.unit)}"></label>
                <label class="inventory-field"><span>Reorder level</span><input name="reorderLevel" type="number" min="0" step="0.01" value="${Number(item.reorderLevel || 0)}"></label>
                <label class="inventory-field"><span>Unit cost (₦)</span><input name="unitCost" type="number" min="0" step="0.01" value="${Number(item.unitCost || 0)}"></label>
                <label class="inventory-field"><span>Supplier</span><input name="supplierName" value="${escapeHtml(item.supplierName || "")}"></label>
                <label class="inventory-field inventory-field--full"><span>Storage location</span><input name="storageLocation" value="${escapeHtml(item.storageLocation || "")}"></label>
                <label class="inventory-field inventory-field--full"><span>Description</span><textarea name="description">${escapeHtml(item.description || "")}</textarea></label>
            `;
            els.modal.showModal();
        } catch (error) {
            toast(error.message, { error: true });
        }
    };

    const openMovementModal = async (itemId, mode) => {
        try {
            const data = await api(`/admin/inventory/items/${itemId}`);
            const item = data.item;
            state.modalMode = "movement";
            state.modalItem = item;
            const titleMap = {stock_in:"Stock in",stock_out:"Stock out",adjustment_in:"Adjustment in",adjustment_out:"Adjustment out"};
            els.modalEyebrow.textContent = item.sku;
            els.modalTitle.textContent = `${titleMap[mode] || "Adjust stock"} · ${item.name}`;
            els.saveModalButton.textContent = "Record movement";
            els.modalBody.innerHTML = `
                <input type="hidden" name="movementType" value="${escapeHtml(mode)}">
                <label class="inventory-field"><span>Quantity</span><input name="quantity" type="number" min="0.01" step="0.01" required placeholder="0"></label>
                <label class="inventory-field"><span>Reference</span><input name="reference" placeholder="Supplier invoice / stock count ref"></label>
                <label class="inventory-field inventory-field--full"><span>Reason</span><input name="reason" placeholder="Reason for this stock movement"></label>
                <label class="inventory-field inventory-field--full"><span>Notes</span><textarea name="notes" placeholder="Optional internal note"></textarea></label>
            `;
            els.modal.showModal();
        } catch (error) {
            toast(error.message, { error: true });
        }
    };

    const openAdjustmentChooser = itemId => {
        state.modalMode = "adjust-chooser";
        state.modalItem = { id: Number(itemId) };
        els.modalEyebrow.textContent = "Inventory adjustment";
        els.modalTitle.textContent = "Choose adjustment direction";
        els.saveModalButton.textContent = "Continue";
        els.modalBody.innerHTML = `<label class="inventory-field inventory-field--full"><span>Adjustment type</span><select name="adjustmentType" required><option value="adjustment_in">Increase stock</option><option value="adjustment_out">Decrease stock</option></select></label>`;
        els.modal.showModal();
    };

    const submitModal = async event => {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(els.modalForm).entries());
        setBusy(els.saveModalButton, true, "Saving...");

        try {
            if (state.modalMode === "add-item") {
                await api("/admin/inventory/items", {
                    method:"POST",
                    body:JSON.stringify({
                        sku:values.sku,name:values.name,description:values.description,
                        categoryId:values.categoryId || null,unit:values.unit,
                        quantityOnHand:Number(values.quantityOnHand || 0),
                        reorderLevel:Number(values.reorderLevel || 0),
                        unitCost:Number(values.unitCost || 0),
                        supplierName:values.supplierName,storageLocation:values.storageLocation
                    })
                });
                toast("Inventory item created.");
                closeModal();
                await refreshAll();
                await loadItems();
                return;
            }

            if (state.modalMode === "edit-item") {
                const itemId = state.modalItem.id;
                await api(`/admin/inventory/items/${itemId}`, {
                    method:"PATCH",
                    body:JSON.stringify({
                        name:values.name,description:values.description,
                        categoryId:values.categoryId || null,unit:values.unit,
                        reorderLevel:Number(values.reorderLevel || 0),
                        unitCost:Number(values.unitCost || 0),
                        supplierName:values.supplierName,storageLocation:values.storageLocation
                    })
                });
                toast("Inventory item updated.");
                closeModal();
                await refreshAll();
                await loadItems();
                if (state.drawerItemId === itemId) await openDrawer(itemId);
                return;
            }

            if (state.modalMode === "movement") {
                const itemId = state.modalItem.id;
                await api(`/admin/inventory/items/${itemId}/movements`, {
                    method:"POST",
                    body:JSON.stringify({
                        movementType:values.movementType,
                        quantity:Number(values.quantity || 0),
                        reference:values.reference,reason:values.reason,notes:values.notes
                    })
                });
                toast("Stock movement recorded.");
                closeModal();
                await refreshAll();
                await loadItems();
                if (state.activeTab === "movements") await loadMovements();
                if (state.drawerItemId === itemId) await openDrawer(itemId);
                return;
            }

            if (state.modalMode === "adjust-chooser") {
                const itemId = state.modalItem.id;
                const mode = values.adjustmentType;
                closeModal();
                await openMovementModal(itemId, mode);
            }
        } catch (error) {
            toast(error.message, { error:true });
        } finally {
            setBusy(els.saveModalButton, false);
        }
    };

    const handleActionClick = event => {
        const target = event.target.closest("button,[data-view-item]");
        if (!target) return;
        if (target.dataset.viewItem) return openDrawer(target.dataset.viewItem);
        if (target.dataset.stockIn) return openMovementModal(target.dataset.stockIn, "stock_in");
        if (target.dataset.stockOut) return openMovementModal(target.dataset.stockOut, "stock_out");
        if (target.dataset.adjustItem) return openAdjustmentChooser(target.dataset.adjustItem);
        if (target.dataset.editItem) return openEditItemModal(target.dataset.editItem);
    };

    let searchTimer = null;
    els.inventorySearch.addEventListener("input", () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => loadItems().catch(e => toast(e.message,{error:true})), 250);
    });
    els.inventoryCategoryFilter.addEventListener("change", () => loadItems().catch(e => toast(e.message,{error:true})));
    els.inventoryStatusFilter.addEventListener("change", () => loadItems().catch(e => toast(e.message,{error:true})));
    els.tabs.forEach(button => button.addEventListener("click", () => setTab(button.dataset.inventoryTab)));
    els.refreshInventoryButton.addEventListener("click", refreshAll);
    els.addInventoryItemButton.addEventListener("click", openAddItemModal);
    els.inventoryAlertList.addEventListener("click", handleActionClick);
    els.inventoryItemsTableBody.addEventListener("click", handleActionClick);
    els.drawerBody.addEventListener("click", handleActionClick);
    els.closeDrawerButton.addEventListener("click", closeDrawer);
    els.drawerBackdrop.addEventListener("click", closeDrawer);
    els.closeModalButton.addEventListener("click", closeModal);
    els.cancelModalButton.addEventListener("click", closeModal);
    els.modalForm.addEventListener("submit", submitModal);
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && els.drawer.classList.contains("is-open")) closeDrawer();
    });

    refreshAll().catch(error => toast(error.message, { error:true }));
});
