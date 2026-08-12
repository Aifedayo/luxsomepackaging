-- Migration number: 0003 	 2026-08-09T16:01:20.658Z
CREATE TABLE IF NOT EXISTS production_schedule_tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    order_id INTEGER NOT NULL,
    order_item_id INTEGER,

    task_key TEXT,
    task_name TEXT NOT NULL,
    task_type TEXT,

    status TEXT NOT NULL DEFAULT 'not_started',
    priority TEXT NOT NULL DEFAULT 'normal',

    assigned_to TEXT,

    planned_start_date TEXT,
    planned_end_date TEXT,

    actual_start_date TEXT,
    actual_end_date TEXT,

    progress INTEGER NOT NULL DEFAULT 0,

    dependency_task_id INTEGER,

    sort_order INTEGER NOT NULL DEFAULT 0,

    notes TEXT,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    FOREIGN KEY (order_id)
        REFERENCES orders(id)
        ON DELETE CASCADE,

    FOREIGN KEY (order_item_id)
        REFERENCES order_items(id)
        ON DELETE SET NULL,

    FOREIGN KEY (dependency_task_id)
        REFERENCES production_schedule_tasks(id)
        ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_production_schedule_order
ON production_schedule_tasks(order_id);

CREATE INDEX IF NOT EXISTS idx_production_schedule_order_item
ON production_schedule_tasks(order_item_id);

CREATE INDEX IF NOT EXISTS idx_production_schedule_dates
ON production_schedule_tasks(
    planned_start_date,
    planned_end_date
);

CREATE INDEX IF NOT EXISTS idx_production_schedule_status
ON production_schedule_tasks(status);

CREATE INDEX IF NOT EXISTS idx_production_schedule_assignee
ON production_schedule_tasks(assigned_to);