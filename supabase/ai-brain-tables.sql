-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- AI Memory Bank
CREATE TABLE IF NOT EXISTS ai_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  memory_type VARCHAR NOT NULL,
  entity_type VARCHAR NOT NULL,
  entity_id UUID,
  content TEXT NOT NULL,
  embedding vector(1536),
  metadata JSONB DEFAULT '{}',
  importance_score FLOAT NOT NULL DEFAULT 0.5,
  access_frequency INTEGER DEFAULT 0,
  last_accessed TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_ai_memory_org ON ai_memory(organization_id);
CREATE INDEX idx_ai_memory_type ON ai_memory(memory_type, entity_type);
CREATE INDEX idx_ai_memory_entity ON ai_memory(entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX idx_ai_memory_importance ON ai_memory(importance_score DESC);
CREATE INDEX idx_ai_memory_embedding ON ai_memory USING ivfflat (embedding vector_cosine_ops);

-- Knowledge Graph Connections
CREATE TABLE IF NOT EXISTS ai_knowledge_graph (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  from_node UUID NOT NULL,
  from_type VARCHAR NOT NULL,
  to_node UUID NOT NULL,
  to_type VARCHAR NOT NULL,
  relationship_type VARCHAR NOT NULL,
  strength FLOAT DEFAULT 1.0,
  evidence JSONB DEFAULT '{}',
  confidence FLOAT DEFAULT 0.5,
  discovered_at TIMESTAMP DEFAULT NOW(),
  last_updated TIMESTAMP DEFAULT NOW()
);

-- Indexes for graph traversal
CREATE INDEX idx_ai_kg_org ON ai_knowledge_graph(organization_id);
CREATE INDEX idx_ai_kg_from ON ai_knowledge_graph(from_node, from_type);
CREATE INDEX idx_ai_kg_to ON ai_knowledge_graph(to_node, to_type);
CREATE INDEX idx_ai_kg_relationship ON ai_knowledge_graph(relationship_type);

-- AI Insights and Predictions
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  insight_type VARCHAR NOT NULL,
  entities_involved JSONB DEFAULT '[]',
  insight_content TEXT NOT NULL,
  confidence_score FLOAT NOT NULL,
  supporting_evidence JSONB DEFAULT '[]',
  impact_prediction JSONB DEFAULT '{}',
  status VARCHAR DEFAULT 'active',
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for insights
CREATE INDEX idx_ai_insights_org ON ai_insights(organization_id);
CREATE INDEX idx_ai_insights_type ON ai_insights(insight_type);
CREATE INDEX idx_ai_insights_status ON ai_insights(status);
CREATE INDEX idx_ai_insights_confidence ON ai_insights(confidence_score DESC);

-- Federated Learning Patterns
CREATE TABLE IF NOT EXISTS federated_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pattern_type VARCHAR NOT NULL,
  pattern_category VARCHAR NOT NULL,
  pattern_data JSONB NOT NULL,
  sample_size INTEGER NOT NULL,
  confidence_score FLOAT NOT NULL,
  performance_metrics JSONB DEFAULT '{}',
  contributing_orgs INTEGER DEFAULT 1,
  applicable_contexts TEXT[] DEFAULT '{}',
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for pattern matching
CREATE INDEX idx_federated_type ON federated_patterns(pattern_type);
CREATE INDEX idx_federated_category ON federated_patterns(pattern_category);
CREATE INDEX idx_federated_confidence ON federated_patterns(confidence_score DESC);
CREATE INDEX idx_federated_contexts ON federated_patterns USING gin(applicable_contexts);

-- AI Response Cache
CREATE TABLE IF NOT EXISTS ai_response_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_hash VARCHAR UNIQUE NOT NULL,
  query_type VARCHAR NOT NULL,
  response JSONB NOT NULL,
  model_used VARCHAR,
  cost DECIMAL(10,4),
  hit_count INTEGER DEFAULT 0,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for cache
CREATE INDEX idx_ai_cache_hash ON ai_response_cache(query_hash);
CREATE INDEX idx_ai_cache_type ON ai_response_cache(query_type);
CREATE INDEX idx_ai_cache_expires ON ai_response_cache(expires_at);

-- AI Learning Events
CREATE TABLE IF NOT EXISTS ai_learning_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  prediction_id UUID,
  predicted_value JSONB,
  actual_value JSONB,
  accuracy FLOAT,
  context JSONB DEFAULT '{}',
  patterns_learned INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- AI Learning Patterns
CREATE TABLE IF NOT EXISTS ai_learning_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  pattern_type VARCHAR NOT NULL,
  pattern_data JSONB NOT NULL,
  pattern_hash VARCHAR NOT NULL,
  confidence FLOAT DEFAULT 0.5,
  sample_size INTEGER DEFAULT 1,
  success_rate FLOAT,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Unique constraint on pattern hash per org
CREATE UNIQUE INDEX idx_ai_pattern_unique ON ai_learning_patterns(organization_id, pattern_hash);

-- AI Feedback
CREATE TABLE IF NOT EXISTS ai_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  feedback_type VARCHAR NOT NULL CHECK (feedback_type IN ('positive', 'negative')),
  context JSONB NOT NULL,
  factors_identified JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Function to search memories using vector similarity
CREATE OR REPLACE FUNCTION search_memories(
  query_embedding vector(1536),
  org_id UUID,
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  memory_type VARCHAR,
  entity_type VARCHAR,
  entity_id UUID,
  content TEXT,
  embedding vector(1536),
  metadata JSONB,
  importance_score FLOAT,
  access_frequency INTEGER,
  similarity FLOAT,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.organization_id,
    m.memory_type,
    m.entity_type,
    m.entity_id,
    m.content,
    m.embedding,
    m.metadata,
    m.importance_score,
    m.access_frequency,
    1 - (m.embedding <=> query_embedding) AS similarity,
    m.created_at
  FROM ai_memory m
  WHERE m.organization_id = org_id
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Function to find similar memories
CREATE OR REPLACE FUNCTION find_similar_memories(
  memory_embedding vector(1536),
  org_id UUID,
  memory_id UUID,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  memory_type VARCHAR,
  entity_type VARCHAR,
  entity_id UUID,
  content TEXT,
  embedding vector(1536),
  metadata JSONB,
  importance_score FLOAT,
  similarity FLOAT,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.organization_id,
    m.memory_type,
    m.entity_type,
    m.entity_id,
    m.content,
    m.embedding,
    m.metadata,
    m.importance_score,
    1 - (m.embedding <=> memory_embedding) AS similarity,
    m.created_at
  FROM ai_memory m
  WHERE m.organization_id = org_id
    AND m.id != memory_id
  ORDER BY similarity DESC
  LIMIT match_count;
END;
$$ LANGUAGE plpgsql;

-- Function to find duplicate memories
CREATE OR REPLACE FUNCTION find_duplicate_memories(
  org_id UUID,
  similarity_threshold FLOAT DEFAULT 0.95
)
RETURNS TABLE (
  group_id INTEGER,
  memory_ids UUID[]
) AS $$
BEGIN
  -- This is a simplified version. In production, you'd use clustering algorithms
  RETURN QUERY
  WITH memory_pairs AS (
    SELECT 
      m1.id AS id1,
      m2.id AS id2,
      1 - (m1.embedding <=> m2.embedding) AS similarity
    FROM ai_memory m1
    JOIN ai_memory m2 ON m1.organization_id = m2.organization_id
    WHERE m1.organization_id = org_id
      AND m1.id < m2.id
      AND 1 - (m1.embedding <=> m2.embedding) > similarity_threshold
  )
  SELECT 
    ROW_NUMBER() OVER () AS group_id,
    ARRAY[id1, id2] AS memory_ids
  FROM memory_pairs;
END;
$$ LANGUAGE plpgsql;

-- Function to increment memory access frequency
CREATE OR REPLACE FUNCTION increment_memory_access(memory_ids UUID[])
RETURNS VOID AS $$
BEGIN
  UPDATE ai_memory
  SET 
    access_frequency = access_frequency + 1,
    last_accessed = NOW()
  WHERE id = ANY(memory_ids);
END;
$$ LANGUAGE plpgsql;

-- Function to detect attendance anomalies
CREATE OR REPLACE FUNCTION detect_attendance_anomalies(
  org_id UUID,
  lookback_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  class_id UUID,
  pattern VARCHAR,
  deviation_score FLOAT,
  estimated_impact DECIMAL
) AS $$
BEGIN
  -- Placeholder implementation
  RETURN QUERY
  SELECT 
    p.id AS class_id,
    'low_attendance'::VARCHAR AS pattern,
    0.8::FLOAT AS deviation_score,
    100.00::DECIMAL AS estimated_impact
  FROM programs p
  WHERE p.organization_id = org_id
  LIMIT 0; -- No results for now
END;
$$ LANGUAGE plpgsql;

-- Function to identify upsell opportunities
CREATE OR REPLACE FUNCTION identify_upsell_opportunities(org_id UUID)
RETURNS TABLE (
  client_id UUID,
  opportunity_type VARCHAR,
  probability FLOAT,
  potential_value DECIMAL
) AS $$
BEGIN
  -- Placeholder implementation
  RETURN QUERY
  SELECT 
    l.id AS client_id,
    'membership_upgrade'::VARCHAR AS opportunity_type,
    0.75::FLOAT AS probability,
    50.00::DECIMAL AS potential_value
  FROM leads l
  WHERE l.organization_id = org_id
  LIMIT 0; -- No results for now
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE ai_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_knowledge_graph ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_learning_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_learning_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_response_cache ENABLE ROW LEVEL SECURITY;

-- Policies for ai_memory
CREATE POLICY "Users can view their organization's memories" ON ai_memory
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create memories for their organization" ON ai_memory
  FOR INSERT WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update their organization's memories" ON ai_memory
  FOR UPDATE USING (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

-- Similar policies for other tables
CREATE POLICY "Users can view their organization's knowledge graph" ON ai_knowledge_graph
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create knowledge graph entries" ON ai_knowledge_graph
  FOR INSERT WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can view their organization's insights" ON ai_insights
  FOR SELECT USING (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create insights" ON ai_insights
  FOR INSERT WITH CHECK (organization_id IN (
    SELECT organization_id FROM organization_users WHERE user_id = auth.uid()
  ));

-- Federated patterns are viewable by all (anonymized data)
CREATE POLICY "Anyone can view federated patterns" ON federated_patterns
  FOR SELECT USING (true);

-- Cache is accessible by all (performance optimization)
CREATE POLICY "Anyone can read cache" ON ai_response_cache
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create cache entries" ON ai_response_cache
  FOR INSERT WITH CHECK (true);

-- Triggers to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ai_memory_updated_at
  BEFORE UPDATE ON ai_memory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_ai_knowledge_graph_updated_at
  BEFORE UPDATE ON ai_knowledge_graph
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_ai_insights_updated_at
  BEFORE UPDATE ON ai_insights
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();