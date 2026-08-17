-- Luxsome Paystack invoice payment gateway v1
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS payment_gateway_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    provider TEXT NOT NULL DEFAULT 'paystack',
    provider_reference TEXT NOT NULL,
    provider_transaction_id TEXT,
    access_code TEXT,
    authorization_url TEXT,
    status TEXT NOT NULL DEFAULT 'initialized'
        CHECK (status IN (
            'initialized','pending','success','failed','abandoned',
            'ongoing','processing','queued','reversed','superseded'
        )),
    amount REAL NOT NULL CHECK (amount > 0),
    amount_subunit INTEGER NOT NULL CHECK (amount_subunit > 0),
    currency TEXT NOT NULL DEFAULT 'NGN',
    customer_email TEXT NOT NULL,
    channel TEXT,
    fees_subunit INTEGER,
    gateway_response TEXT,
    metadata_json TEXT,
    provider_payload_json TEXT,
    invoice_payment_id INTEGER,
    paid_at TEXT,
    verified_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE RESTRICT,
    FOREIGN KEY (invoice_payment_id) REFERENCES invoice_payments(id) ON DELETE SET NULL,
    UNIQUE (provider, provider_reference)
);

CREATE INDEX IF NOT EXISTS idx_gateway_transactions_invoice
ON payment_gateway_transactions(invoice_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gateway_transactions_status
ON payment_gateway_transactions(provider, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS payment_gateway_webhook_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    provider TEXT NOT NULL,
    event_hash TEXT NOT NULL,
    event_type TEXT NOT NULL,
    provider_reference TEXT,
    status TEXT NOT NULL DEFAULT 'received'
        CHECK (status IN ('received','processed','failed')),
    payload_json TEXT NOT NULL,
    error_message TEXT,
    received_at TEXT NOT NULL,
    processed_at TEXT,
    updated_at TEXT NOT NULL,
    UNIQUE (provider, event_hash)
);

CREATE INDEX IF NOT EXISTS idx_gateway_webhook_reference
ON payment_gateway_webhook_events(
    provider,
    provider_reference,
    received_at DESC
);

ALTER TABLE invoice_payments ADD COLUMN provider TEXT;
ALTER TABLE invoice_payments ADD COLUMN provider_reference TEXT;
ALTER TABLE invoice_payments ADD COLUMN provider_transaction_id TEXT;
ALTER TABLE invoice_payments ADD COLUMN provider_channel TEXT;
ALTER TABLE invoice_payments ADD COLUMN provider_fees_subunit INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoice_payments_provider_reference
ON invoice_payments(provider, provider_reference)
WHERE provider IS NOT NULL
  AND provider_reference IS NOT NULL;
