-- ═══════════════════════════════════════════════════════════
--  RapidRoute AI — Database Schema (PostgreSQL)
-- ═══════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── ENUM TYPES ────────────────────────────────────────────
CREATE TYPE user_role AS ENUM ('admin', 'driver', 'officer', 'hospital', 'control_room');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');
CREATE TYPE ambulance_status AS ENUM ('available', 'on_duty', 'emergency', 'maintenance', 'offline');
CREATE TYPE emergency_status AS ENUM ('pending', 'active', 'completed', 'cancelled');
CREATE TYPE emergency_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE route_type AS ENUM ('normal', 'ai_optimized', 'alternative', 'recalculated');
CREATE TYPE traffic_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE alert_status AS ENUM ('pending', 'sent', 'acknowledged', 'clearing', 'cleared', 'passed');
CREATE TYPE junction_status AS ENUM ('clear', 'congested', 'blocked', 'alert_sent');
CREATE TYPE officer_status AS ENUM ('available', 'on_duty', 'off_duty');
CREATE TYPE hospital_emergency_status AS ENUM ('available', 'busy', 'full');

-- ── USERS ─────────────────────────────────────────────────
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(255) UNIQUE NOT NULL,
  phone         VARCHAR(20),
  password_hash TEXT NOT NULL,
  role          user_role NOT NULL,
  status        user_status NOT NULL DEFAULT 'active',
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role  ON users(role);

-- ── HOSPITALS ─────────────────────────────────────────────
CREATE TABLE hospitals (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name             VARCHAR(200) NOT NULL,
  address          TEXT NOT NULL,
  latitude         DOUBLE PRECISION NOT NULL,
  longitude        DOUBLE PRECISION NOT NULL,
  contact_phone    VARCHAR(20),
  contact_email    VARCHAR(255),
  emergency_status hospital_emergency_status NOT NULL DEFAULT 'available',
  total_beds       INTEGER DEFAULT 0,
  available_beds   INTEGER DEFAULT 0,
  user_id          UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── JUNCTIONS ─────────────────────────────────────────────
CREATE TABLE junctions (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name           VARCHAR(200) NOT NULL,
  latitude       DOUBLE PRECISION NOT NULL,
  longitude      DOUBLE PRECISION NOT NULL,
  traffic_level  traffic_level NOT NULL DEFAULT 'low',
  status         junction_status NOT NULL DEFAULT 'clear',
  road_names     TEXT[],
  signal_count   INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── AMBULANCES ────────────────────────────────────────────
CREATE TABLE ambulances (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ambulance_number  VARCHAR(50) UNIQUE NOT NULL,
  vehicle_type      VARCHAR(50) DEFAULT 'ALS',
  driver_id         UUID REFERENCES users(id) ON DELETE SET NULL,
  current_latitude  DOUBLE PRECISION,
  current_longitude DOUBLE PRECISION,
  current_speed     DOUBLE PRECISION DEFAULT 0,
  heading           DOUBLE PRECISION DEFAULT 0,
  status            ambulance_status NOT NULL DEFAULT 'available',
  last_location_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ambulances_driver ON ambulances(driver_id);
CREATE INDEX idx_ambulances_status ON ambulances(status);

-- ── TRAFFIC OFFICERS ──────────────────────────────────────
CREATE TABLE traffic_officers (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_number        VARCHAR(50) UNIQUE,
  assigned_junction_id UUID REFERENCES junctions(id) ON DELETE SET NULL,
  status              officer_status NOT NULL DEFAULT 'available',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_officers_user ON traffic_officers(user_id);
CREATE INDEX idx_officers_junction ON traffic_officers(assigned_junction_id);

-- ── EMERGENCIES ───────────────────────────────────────────
CREATE TABLE emergencies (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  emergency_code       VARCHAR(20) UNIQUE NOT NULL,
  ambulance_id         UUID NOT NULL REFERENCES ambulances(id),
  hospital_id          UUID NOT NULL REFERENCES hospitals(id),
  driver_id            UUID NOT NULL REFERENCES users(id),
  start_time           TIMESTAMPTZ,
  end_time             TIMESTAMPTZ,
  status               emergency_status NOT NULL DEFAULT 'pending',
  priority             emergency_priority NOT NULL DEFAULT 'high',
  start_latitude       DOUBLE PRECISION,
  start_longitude      DOUBLE PRECISION,
  current_latitude     DOUBLE PRECISION,
  current_longitude    DOUBLE PRECISION,
  eta_minutes          DOUBLE PRECISION,
  distance_remaining   DOUBLE PRECISION,
  current_speed        DOUBLE PRECISION DEFAULT 0,
  patient_info         JSONB DEFAULT '{}',
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_emergencies_ambulance ON emergencies(ambulance_id);
CREATE INDEX idx_emergencies_status    ON emergencies(status);
CREATE INDEX idx_emergencies_created   ON emergencies(created_at DESC);

-- ── ROUTES ────────────────────────────────────────────────
CREATE TABLE routes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  emergency_id     UUID NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
  route_type       route_type NOT NULL DEFAULT 'normal',
  waypoints        JSONB NOT NULL DEFAULT '[]',
  distance_km      DOUBLE PRECISION NOT NULL,
  estimated_time   DOUBLE PRECISION NOT NULL,
  ai_score         DOUBLE PRECISION DEFAULT 0,
  ai_reasoning     TEXT,
  is_active        BOOLEAN NOT NULL DEFAULT FALSE,
  traffic_snapshot JSONB DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_routes_emergency ON routes(emergency_id);
CREATE INDEX idx_routes_active    ON routes(emergency_id, is_active);

-- ── ALERTS ────────────────────────────────────────────────
CREATE TABLE alerts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  emergency_id    UUID NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
  junction_id     UUID NOT NULL REFERENCES junctions(id),
  officer_id      UUID REFERENCES traffic_officers(id),
  priority        emergency_priority NOT NULL DEFAULT 'high',
  status          alert_status NOT NULL DEFAULT 'pending',
  eta_minutes     DOUBLE PRECISION,
  message         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at         TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  clearing_at     TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ
);

CREATE INDEX idx_alerts_emergency ON alerts(emergency_id);
CREATE INDEX idx_alerts_officer   ON alerts(officer_id);
CREATE INDEX idx_alerts_junction  ON alerts(junction_id);
CREATE INDEX idx_alerts_status    ON alerts(status);

-- ── TRAFFIC DATA ──────────────────────────────────────────
CREATE TABLE traffic_data (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  junction_id    UUID NOT NULL REFERENCES junctions(id) ON DELETE CASCADE,
  traffic_level  traffic_level NOT NULL,
  vehicle_count  INTEGER DEFAULT 0,
  average_speed  DOUBLE PRECISION DEFAULT 0,
  congestion_pct DOUBLE PRECISION DEFAULT 0,
  recorded_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_traffic_junction   ON traffic_data(junction_id);
CREATE INDEX idx_traffic_recorded   ON traffic_data(recorded_at DESC);

-- ── EMERGENCY TRIP ANALYTICS ──────────────────────────────
CREATE TABLE emergency_trip_analytics (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  emergency_id       UUID UNIQUE NOT NULL REFERENCES emergencies(id) ON DELETE CASCADE,
  normal_eta         DOUBLE PRECISION,
  optimized_eta      DOUBLE PRECISION,
  actual_duration    DOUBLE PRECISION,
  time_saved         DOUBLE PRECISION,
  distance_km        DOUBLE PRECISION,
  junctions_alerted  INTEGER DEFAULT 0,
  junctions_cleared  INTEGER DEFAULT 0,
  route_changes      INTEGER DEFAULT 0,
  avg_speed          DOUBLE PRECISION,
  ai_recommendations INTEGER DEFAULT 0,
  completed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── NOTIFICATIONS ─────────────────────────────────────────
CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  message     TEXT NOT NULL,
  type        VARCHAR(50) NOT NULL DEFAULT 'info',
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user   ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);

-- ── AUDIT LOGS ────────────────────────────────────────────
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(100) NOT NULL,
  resource    VARCHAR(100),
  resource_id UUID,
  details     JSONB DEFAULT '{}',
  ip_address  INET,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_user    ON audit_logs(user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);

-- ── UPDATED_AT TRIGGER ────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated          BEFORE UPDATE ON users          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_hospitals_updated      BEFORE UPDATE ON hospitals      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_junctions_updated      BEFORE UPDATE ON junctions      FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_ambulances_updated     BEFORE UPDATE ON ambulances     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_officers_updated       BEFORE UPDATE ON traffic_officers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_emergencies_updated    BEFORE UPDATE ON emergencies    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- -- NOTIFICATIONS -------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       VARCHAR(200) NOT NULL,
  message     TEXT NOT NULL,
  type        VARCHAR(50) NOT NULL DEFAULT 'info',
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read    ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- -- EMERGENCY TRIP ANALYTICS -------------------------------------
CREATE TABLE IF NOT EXISTS emergency_trip_analytics (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  emergency_id         UUID NOT NULL UNIQUE REFERENCES emergencies(id) ON DELETE CASCADE,
  normal_eta           DOUBLE PRECISION,   -- minutes without AI
  optimized_eta        DOUBLE PRECISION,   -- AI-predicted ETA
  actual_duration      DOUBLE PRECISION,   -- real trip duration
  time_saved           DOUBLE PRECISION,   -- normal_eta - actual_duration
  junctions_alerted    INTEGER DEFAULT 0,
  junctions_cleared    INTEGER DEFAULT 0,
  route_changes        INTEGER DEFAULT 0,
  avg_speed_kmh        DOUBLE PRECISION,
  peak_hour            BOOLEAN DEFAULT FALSE,
  ai_score             DOUBLE PRECISION,
  completed_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analytics_emergency  ON emergency_trip_analytics(emergency_id);
CREATE INDEX idx_analytics_completed  ON emergency_trip_analytics(completed_at DESC);

