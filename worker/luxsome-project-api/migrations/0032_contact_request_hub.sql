PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS quotation_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_reference TEXT NOT NULL UNIQUE,
  customer_id INTEGER,
  brand_name TEXT NOT NULL,
  contact_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  approximate_quantity TEXT,
  customer_note TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'website-contact',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','quotation_created','sent','closed')),
  quotation_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT,
  closed_at TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS quotation_request_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  product TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (request_id) REFERENCES quotation_requests(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sample_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_reference TEXT NOT NULL UNIQUE,
  customer_id INTEGER,
  brand_name TEXT NOT NULL,
  contact_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  sample_basis TEXT NOT NULL DEFAULT 'reference' CHECK (sample_basis IN ('reference','artwork','recommendation','none')),
  customer_note TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'website-contact',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','sample_quoted','awaiting_payment','in_production','dispatched','completed','closed')),
  attachment_r2_key TEXT,
  attachment_name TEXT,
  attachment_type TEXT,
  attachment_size INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_at TEXT,
  closed_at TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sample_request_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  request_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  product TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (request_id) REFERENCES sample_requests(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_quotation_requests_status_created ON quotation_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotation_requests_email ON quotation_requests(email);
CREATE INDEX IF NOT EXISTS idx_sample_requests_status_created ON sample_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sample_requests_email ON sample_requests(email);
