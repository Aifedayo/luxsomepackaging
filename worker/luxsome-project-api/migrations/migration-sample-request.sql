PRAGMA defer_foreign_keys = ON;

ALTER TABLE submissions RENAME TO submissions_old;

CREATE TABLE submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    reference TEXT NOT NULL UNIQUE,

    submission_type TEXT NOT NULL
        CHECK (
            submission_type IN (
                'project',
                'contact',
                'sample_request'
            )
        ),

    status TEXT NOT NULL DEFAULT 'new'
        CHECK (
            status IN (
                'new',
                'reviewing',
                'quoted',
                'closed',

                'sample_requested',
                'sample_quoted',
                'sample_paid',
                'sample_in_production',
                'sample_ready',
                'sample_approved',
                'sample_revision'
            )
        ),

    customer_name TEXT NOT NULL DEFAULT '',
    brand_name TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',

    summary TEXT NOT NULL DEFAULT '',

    payload_json TEXT NOT NULL DEFAULT '{}',

    email_status TEXT NOT NULL DEFAULT 'pending'
        CHECK (
            email_status IN (
                'pending',
                'sent',
                'failed'
            )
        ),

    email_error TEXT NOT NULL DEFAULT '',

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

INSERT INTO submissions (
    id,
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
    payload_json,
    email_status,
    email_error,
    created_at,
    updated_at
FROM submissions_old;

DROP TABLE submissions_old;

CREATE INDEX IF NOT EXISTS idx_submissions_created_at
    ON submissions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_submissions_status
    ON submissions(status);

CREATE INDEX IF NOT EXISTS idx_submissions_type
    ON submissions(submission_type);

CREATE INDEX IF NOT EXISTS idx_submissions_email
    ON submissions(email);

PRAGMA defer_foreign_keys = OFF;