-- Create user_usage table to track message usage
CREATE TABLE IF NOT EXISTS user_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,  -- Clerk user ID
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  message_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  
  -- Unique constraint to ensure one record per user per day
  UNIQUE(user_id, date)
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_usage_user_id_date ON user_usage(user_id, date);

-- Enable RLS
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own usage"
  ON user_usage
  FOR SELECT
  TO authenticated
  USING (user_id = (auth.jwt()->>'sub')::text);

-- Allow service role to manage all usage records
CREATE POLICY "Service role can manage all usage records"
  ON user_usage
  USING (auth.role() = 'service_role');

-- Trigger to update updated_at on user_usage
DROP TRIGGER IF EXISTS update_user_usage_updated_at ON user_usage;
CREATE TRIGGER update_user_usage_updated_at
BEFORE UPDATE ON user_usage
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add usage_limit column to subscriptions table
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS daily_message_limit INTEGER DEFAULT 5;
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS history_days INTEGER DEFAULT 7;
