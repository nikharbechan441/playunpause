CREATE TABLE IF NOT EXISTS sync_decks (
  deck_code TEXT PRIMARY KEY,
  tier TEXT NOT NULL DEFAULT 'pro',
  email_hash TEXT,
  whop_ref TEXT,
  state_json TEXT NOT NULL DEFAULT '{"crackedSafeIds":[],"checkedRouteIds":[],"savedPins":[]}',
  active INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_decks_email_hash ON sync_decks(email_hash);
CREATE INDEX IF NOT EXISTS idx_sync_decks_whop_ref ON sync_decks(whop_ref);

CREATE TABLE IF NOT EXISTS orders (
  transaction_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  product_kind TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  buyer_email_hash TEXT,
  deck_code TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_deck_code ON orders(deck_code);

CREATE TABLE IF NOT EXISTS sponsors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  badge_text TEXT NOT NULL,
  target_url TEXT NOT NULL,
  starts_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);
