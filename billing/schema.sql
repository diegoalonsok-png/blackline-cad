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

-- Proyectos en la nube (gzip + base64; máx. ~1,9 MB por proyecto) y 10 versiones anteriores por proyecto
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  data TEXT NOT NULL,
  size INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  share_id TEXT UNIQUE                     -- enlace de solo lectura (NULL = no compartido)
);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id, updated_at);
CREATE TABLE IF NOT EXISTS project_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_versions_project ON project_versions(project_id, id);

-- Plan Estudio: el titular invita hasta 4 correos, que pasan a Pro mientras su suscripción esté vigente.
-- (El Worker también crea esta tabla solo si falta.)
CREATE TABLE IF NOT EXISTS team_members (
  owner_id TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY(owner_id,email)
);
CREATE INDEX IF NOT EXISTS idx_team_email ON team_members(email);
