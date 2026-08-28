PRAGMA foreign_keys = OFF;

CREATE TABLE quotations_fixed (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_reference TEXT NOT NULL UNIQUE,
    submission_reference TEXT,
    customer_id INTEGER,

    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (
            status IN (
                'draft',
                'sent',
                'accepted',
                'declined',
                'expired',
                'cancelled'
            )
        ),

    customer_name TEXT NOT NULL DEFAULT '',
    brand_name TEXT NOT NULL DEFAULT '',
    customer_email TEXT NOT NULL DEFAULT '',
    customer_phone TEXT NOT NULL DEFAULT '',
    currency TEXT NOT NULL DEFAULT 'NGN',

    issue_date TEXT NOT NULL,
    expiry_date TEXT NOT NULL,
    production_timeline TEXT NOT NULL DEFAULT '',
    payment_terms TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',

    subtotal INTEGER NOT NULL DEFAULT 0,
    discount INTEGER NOT NULL DEFAULT 0,
    delivery_fee INTEGER NOT NULL DEFAULT 0,
    tax INTEGER NOT NULL DEFAULT 0,
    grand_total INTEGER NOT NULL DEFAULT 0,

    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    sent_at TEXT,
    send_count INTEGER NOT NULL DEFAULT 0,
    resend_email_id TEXT,
    public_token TEXT,
    viewed_at TEXT,
    last_viewed_at TEXT,
    view_count INTEGER NOT NULL DEFAULT 0,
    accepted_at TEXT,
    declined_at TEXT,
    responded_at TEXT,
    response_type TEXT,
    response_comment TEXT,
    response_reason TEXT,

    FOREIGN KEY (submission_reference)
        REFERENCES submissions(reference)
        ON DELETE SET NULL,

    FOREIGN KEY (customer_id)
        REFERENCES customers(id)
        ON DELETE SET NULL
);

INSERT INTO quotations_fixed (
    id,
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
    updated_at,
    sent_at,
    send_count,
    resend_email_id,
    public_token,
    viewed_at,
    last_viewed_at,
    view_count,
    accepted_at,
    declined_at,
    responded_at,
    response_type,
    response_comment,
    response_reason
)
SELECT
    id,
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
    updated_at,
    sent_at,
    send_count,
    resend_email_id,
    public_token,
    viewed_at,
    last_viewed_at,
    view_count,
    accepted_at,
    declined_at,
    responded_at,
    response_type,
    response_comment,
    response_reason
FROM quotations;

DROP TABLE quotations;

ALTER TABLE quotations_fixed RENAME TO quotations;

PRAGMA foreign_keys = ON;
