-- CAD2D · esquema D1 (SQLite) para cuentas y suscripciones
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  trial_ends_at INTEGER NOT NULL,          -- fin del período gratuito (por defecto 90 días)
  stripe_customer_id TEXT UNIQUE
);
CREATE TABLE IF NOT EXISTS login_tokens (
  token_hash TEXT PRIMARY KEY,             -- se guarda solo el hash SHA-256 del enlace
  email TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,                     -- id de suscripción de Stripe
  user_id TEXT NOT NULL REFERENCES users(id),
  plan TEXT NOT NULL,                      -- pro | studio
  status TEXT NOT NULL,                    -- active | trialing | past_due | canceled | …
  current_period_end INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS stripe_events (  -- evita procesar dos veces el mismo webhook
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
