-- Migration number: 0004 	 2026-08-11T10:15:21.823Z
-- Migration number: 0004
-- Production task templates and reusable workflow steps


/* ==========================================================
   PRODUCTION TEMPLATES

   A template represents a reusable workflow such as:

   - Rigid Box Production
   - Hang Tag Production
   - Branded Tissue Production
   - Thank You Card Production

   Templates do NOT belong to individual orders.
   They are blueprints used to generate schedule tasks.
========================================================== */

CREATE TABLE IF NOT EXISTS production_task_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    template_key TEXT NOT NULL UNIQUE,

    name TEXT NOT NULL,

    description TEXT,

    product_category TEXT,

    is_active INTEGER NOT NULL DEFAULT 1,

    sort_order INTEGER NOT NULL DEFAULT 0,

    created_at TEXT NOT NULL,

    updated_at TEXT NOT NULL,

    CHECK (
        is_active IN (0, 1)
    )
);


CREATE INDEX IF NOT EXISTS idx_production_templates_active
ON production_task_templates(
    is_active
);


CREATE INDEX IF NOT EXISTS idx_production_templates_category
ON production_task_templates(
    product_category
);


/* ==========================================================
   TEMPLATE STEPS

   Each row is one task in a production workflow.

   Example:

   template:
       Rigid Box Production

   steps:
       1. Artwork approval
       2. Material preparation
       3. Printing
       4. Board cutting
       5. Assembly
       6. Finishing
       7. Quality control

   dependency_step_id allows one template step to depend on
   another template step.
========================================================== */

CREATE TABLE IF NOT EXISTS production_task_template_steps (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    template_id INTEGER NOT NULL,

    step_key TEXT NOT NULL,

    task_name TEXT NOT NULL,

    task_type TEXT,

    description TEXT,

    default_duration_days INTEGER NOT NULL DEFAULT 1,

    default_priority TEXT NOT NULL DEFAULT 'normal',

    default_assigned_to TEXT,

    dependency_step_id INTEGER,

    sort_order INTEGER NOT NULL DEFAULT 0,

    is_active INTEGER NOT NULL DEFAULT 1,

    created_at TEXT NOT NULL,

    updated_at TEXT NOT NULL,

    FOREIGN KEY (template_id)
        REFERENCES production_task_templates(id)
        ON DELETE CASCADE,

    FOREIGN KEY (dependency_step_id)
        REFERENCES production_task_template_steps(id)
        ON DELETE SET NULL,

    UNIQUE (
        template_id,
        step_key
    ),

    CHECK (
        default_duration_days >= 1
    ),

    CHECK (
        default_priority IN (
            'low',
            'normal',
            'high',
            'urgent'
        )
    ),

    CHECK (
        is_active IN (0, 1)
    )
);


CREATE INDEX IF NOT EXISTS idx_template_steps_template
ON production_task_template_steps(
    template_id
);


CREATE INDEX IF NOT EXISTS idx_template_steps_dependency
ON production_task_template_steps(
    dependency_step_id
);


CREATE INDEX IF NOT EXISTS idx_template_steps_active
ON production_task_template_steps(
    is_active
);


/* ==========================================================
   PRODUCT / ITEM MATCHING RULES

   This allows the schedule generator to determine which
   production template should be suggested for an order item.

   Example:

       "magnetic flap rigid box"
               ↓
       Rigid Box Production

       "hang tag"
               ↓
       Hang Tag Production

   Matching will initially be performed against an
   order item's description.
========================================================== */

CREATE TABLE IF NOT EXISTS production_template_item_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    template_id INTEGER NOT NULL,

    match_type TEXT NOT NULL DEFAULT 'contains',

    match_value TEXT NOT NULL,

    priority INTEGER NOT NULL DEFAULT 0,

    is_active INTEGER NOT NULL DEFAULT 1,

    created_at TEXT NOT NULL,

    updated_at TEXT NOT NULL,

    FOREIGN KEY (template_id)
        REFERENCES production_task_templates(id)
        ON DELETE CASCADE,

    CHECK (
        match_type IN (
            'exact',
            'contains'
        )
    ),

    CHECK (
        is_active IN (0, 1)
    )
);


CREATE INDEX IF NOT EXISTS idx_template_item_rules_template
ON production_template_item_rules(
    template_id
);


CREATE INDEX IF NOT EXISTS idx_template_item_rules_active
ON production_template_item_rules(
    is_active
);