CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  name TEXT NOT NULL,
  goals JSONB DEFAULT '[]',
  milestones JSONB DEFAULT '[]',
  decisions JSONB DEFAULT '[]',
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id),
  project_id UUID REFERENCES projects(id),
  agent_id TEXT,
  memory_type TEXT NOT NULL,
  content TEXT NOT NULL,
  embedding vector(1536),
  importance_score INT DEFAULT 5,
  last_accessed TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS memories_embedding_idx ON memories USING ivfflat (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  business_id UUID REFERENCES businesses(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  assigned_agent TEXT,
  priority INT DEFAULT 5,
  parent_task_id UUID REFERENCES tasks(id),
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id),
  agent_name TEXT NOT NULL,
  status TEXT DEFAULT 'assigned',
  percent INT DEFAULT 0,
  output JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS execution_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id),
  agent_id TEXT,
  status TEXT,
  steps_taken JSONB DEFAULT '[]',
  verification_result JSONB,
  tokens_used INT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS knowledge_graph (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_a TEXT NOT NULL,
  relationship TEXT NOT NULL,
  entity_b TEXT NOT NULL,
  business_id UUID REFERENCES businesses(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
