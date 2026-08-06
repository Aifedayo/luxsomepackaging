-- Luxsome CRM artwork review table
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
);

CREATE INDEX IF NOT EXISTS idx_project_artwork_reviews_reference
ON project_artwork_reviews(project_reference);
