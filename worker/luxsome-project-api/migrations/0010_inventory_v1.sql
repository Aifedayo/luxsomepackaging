-- Luxsome Inventory v1
-- D1 / SQLite

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS inventory_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1
        CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    category_id INTEGER,
    unit TEXT NOT NULL,
    quantity_on_hand REAL NOT NULL DEFAULT 0
        CHECK (quantity_on_hand >= 0),
    quantity_reserved REAL NOT NULL DEFAULT 0
        CHECK (quantity_reserved >= 0),
    reorder_level REAL NOT NULL DEFAULT 0
        CHECK (reorder_level >= 0),
    unit_cost REAL NOT NULL DEFAULT 0
        CHECK (unit_cost >= 0),
    supplier_name TEXT,
    storage_location TEXT,
    is_active INTEGER NOT NULL DEFAULT 1
        CHECK (is_active IN (0, 1)),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (category_id)
        REFERENCES inventory_categories(id)
        ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS inventory_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventory_item_id INTEGER NOT NULL,
    movement_type TEXT NOT NULL
        CHECK (
            movement_type IN (
                'stock_in',
                'stock_out',
                'adjustment_in',
                'adjustment_out',
                'production_usage',
                'return_to_stock'
            )
        ),
    quantity REAL NOT NULL
        CHECK (quantity > 0),
    quantity_before REAL NOT NULL,
    quantity_after REAL NOT NULL,
    order_reference TEXT,
    order_item_id INTEGER,
    production_task_id INTEGER,
    reference TEXT,
    reason TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (inventory_item_id)
        REFERENCES inventory_items(id)
        ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS inventory_reservations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventory_item_id INTEGER NOT NULL,
    order_reference TEXT NOT NULL,
    order_item_id INTEGER,
    quantity_reserved REAL NOT NULL
        CHECK (quantity_reserved > 0),
    quantity_consumed REAL NOT NULL DEFAULT 0
        CHECK (quantity_consumed >= 0),
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (
            status IN (
                'active',
                'partially_consumed',
                'consumed',
                'released'
            )
        ),
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (inventory_item_id)
        REFERENCES inventory_items(id)
        ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS inventory_alert_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    inventory_item_id INTEGER NOT NULL,
    alert_status TEXT NOT NULL
        CHECK (
            alert_status IN (
                'low_stock',
                'out_of_stock'
            )
        ),
    quantity_on_hand REAL NOT NULL,
    quantity_reserved REAL NOT NULL,
    quantity_available REAL NOT NULL,
    reorder_level REAL NOT NULL,
    created_at TEXT NOT NULL,
    resolved_at TEXT,
    FOREIGN KEY (inventory_item_id)
        REFERENCES inventory_items(id)
        ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS inventory_alert_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_key TEXT NOT NULL UNIQUE,
    alert_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inventory_items_category
    ON inventory_items(category_id);

CREATE INDEX IF NOT EXISTS idx_inventory_items_active
    ON inventory_items(is_active);

CREATE INDEX IF NOT EXISTS idx_inventory_movements_item_created
    ON inventory_movements(
        inventory_item_id,
        created_at DESC
    );

CREATE INDEX IF NOT EXISTS idx_inventory_movements_order
    ON inventory_movements(order_reference);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_item
    ON inventory_reservations(inventory_item_id);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_order
    ON inventory_reservations(order_reference);

CREATE INDEX IF NOT EXISTS idx_inventory_reservations_status
    ON inventory_reservations(status);

CREATE INDEX IF NOT EXISTS idx_inventory_alert_events_item
    ON inventory_alert_events(
        inventory_item_id,
        resolved_at
    );

-- Baseline categories. Safe to rerun.
INSERT OR IGNORE INTO inventory_categories (
    name,
    slug,
    description,
    sort_order,
    is_active,
    created_at,
    updated_at
) VALUES
('Board', 'board', 'Greyboard and structural board stock.', 10, 1, datetime('now'), datetime('now')),
('Speciality paper', 'speciality-paper', 'Premium paper used to wrap rigid boxes and other packaging.', 20, 1, datetime('now'), datetime('now')),
('Card stock', 'card-stock', 'Paper and card stock for tags, cards and inserts.', 30, 1, datetime('now'), datetime('now')),
('Tissue / wrapping', 'tissue-wrapping', 'Plain tissue, branded tissue and speciality wrapping paper.', 40, 1, datetime('now'), datetime('now')),
('Ribbon', 'ribbon', 'Satin, grosgrain and branded ribbon stock.', 50, 1, datetime('now'), datetime('now')),
('Magnets', 'magnets', 'Magnets used in rigid box closures.', 60, 1, datetime('now'), datetime('now')),
('Eyelets', 'eyelets', 'Eyelets and associated tag or handle hardware.', 70, 1, datetime('now'), datetime('now')),
('Sticker material', 'sticker-material', 'Sticker paper, vinyl and seal materials.', 80, 1, datetime('now'), datetime('now')),
('Adhesives', 'adhesives', 'Glue and adhesive consumables.', 90, 1, datetime('now'), datetime('now')),
('Printing consumables', 'printing-consumables', 'Ink, toner, foil and print consumables.', 100, 1, datetime('now'), datetime('now')),
('Packaging accessories', 'packaging-accessories', 'Handles, pull tabs, dividers and miscellaneous packaging components.', 110, 1, datetime('now'), datetime('now')),
('Other', 'other', 'Other production or packaging material.', 999, 1, datetime('now'), datetime('now'));
