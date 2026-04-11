CREATE TABLE IF NOT EXISTS cvs (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applications (
  id SERIAL PRIMARY KEY,
  company TEXT NOT NULL,
  role TEXT NOT NULL,
  applied BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL DEFAULT 'applied',
  location TEXT,
  notes TEXT,
  applied_at DATE,
  source TEXT,
  source_url TEXT,
  employment_types TEXT[],
  work_time TEXT,
  work_mode TEXT,
  shift_count TEXT,
  working_hours TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  preferred_contract_types TEXT[] NOT NULL DEFAULT '{}',
  preferred_work_times TEXT[] NOT NULL DEFAULT '{}',
  preferred_work_modes TEXT[] NOT NULL DEFAULT '{}',
  preferred_shift_counts TEXT[] NOT NULL DEFAULT '{}',
  preferred_working_hours TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
