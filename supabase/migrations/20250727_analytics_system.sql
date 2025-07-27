-- Analytics Events Table
CREATE TABLE analytics_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  visitor_id VARCHAR(100) NOT NULL,
  session_id VARCHAR(100) NOT NULL,
  path VARCHAR(500) NOT NULL,
  referrer VARCHAR(500),
  device VARCHAR(50),
  browser VARCHAR(50),
  os VARCHAR(50),
  screen_resolution VARCHAR(20),
  viewport VARCHAR(20),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_analytics_events_created_at ON analytics_events(created_at DESC);
CREATE INDEX idx_analytics_events_visitor_id ON analytics_events(visitor_id);
CREATE INDEX idx_analytics_events_session_id ON analytics_events(session_id);
CREATE INDEX idx_analytics_events_type ON analytics_events(type);
CREATE INDEX idx_analytics_events_path ON analytics_events(path);

-- Analytics Aggregates Table (for faster queries)
CREATE TABLE analytics_aggregates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  hour INTEGER,
  metric_type VARCHAR(50) NOT NULL,
  metric_name VARCHAR(100) NOT NULL,
  metric_value INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(date, hour, metric_type, metric_name)
);

-- Create index for faster aggregate queries
CREATE INDEX idx_analytics_aggregates_date ON analytics_aggregates(date DESC);
CREATE INDEX idx_analytics_aggregates_metric ON analytics_aggregates(metric_type, metric_name);

-- Function to update aggregates
CREATE OR REPLACE FUNCTION update_analytics_aggregates()
RETURNS TRIGGER AS $$
BEGIN
  -- Update hourly pageviews
  IF NEW.type = 'pageview' THEN
    INSERT INTO analytics_aggregates (date, hour, metric_type, metric_name, metric_value)
    VALUES (
      DATE(NEW.created_at),
      EXTRACT(HOUR FROM NEW.created_at),
      'pageviews',
      NEW.path,
      1
    )
    ON CONFLICT (date, hour, metric_type, metric_name)
    DO UPDATE SET 
      metric_value = analytics_aggregates.metric_value + 1,
      updated_at = NOW();
  END IF;
  
  -- Update device counts
  INSERT INTO analytics_aggregates (date, hour, metric_type, metric_name, metric_value)
  VALUES (
    DATE(NEW.created_at),
    NULL,
    'device',
    NEW.device,
    1
  )
  ON CONFLICT (date, hour, metric_type, metric_name)
  DO UPDATE SET 
    metric_value = analytics_aggregates.metric_value + 1,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER analytics_aggregates_trigger
AFTER INSERT ON analytics_events
FOR EACH ROW
EXECUTE FUNCTION update_analytics_aggregates();

-- Row Level Security
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_aggregates ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your needs)
CREATE POLICY "Allow anonymous inserts" ON analytics_events 
  FOR INSERT TO anon 
  USING (true);

CREATE POLICY "Allow authenticated reads" ON analytics_events 
  FOR SELECT TO authenticated 
  USING (true);

CREATE POLICY "Allow authenticated reads" ON analytics_aggregates 
  FOR SELECT TO authenticated 
  USING (true);