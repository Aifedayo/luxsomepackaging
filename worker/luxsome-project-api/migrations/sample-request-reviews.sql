-- Luxsome CRM — sample request review + customer email workflow

CREATE TABLE IF NOT EXISTS sample_request_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_reference TEXT NOT NULL UNIQUE,
    decision TEXT NOT NULL DEFAULT 'pending_review',
    internal_notes TEXT,
    customer_message TEXT,
    scope_reason TEXT,
    reviewed_by TEXT,
    reviewed_at TEXT,
    email_status TEXT NOT NULL DEFAULT 'not_sent',
    email_sent_at TEXT,
    email_send_count INTEGER NOT NULL DEFAULT 0,
    resend_email_id TEXT,
    email_error TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (submission_reference)
        REFERENCES submissions(reference)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sample_request_reviews_reference
ON sample_request_reviews(submission_reference);
