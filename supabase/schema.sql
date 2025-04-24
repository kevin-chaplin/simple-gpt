-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,  -- Keeping as TEXT to store Clerk user IDs
  title TEXT NOT NULL DEFAULT 'New Conversation',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,

  -- Add index for faster queries
  CONSTRAINT fk_conversation
    FOREIGN KEY (conversation_id)
    REFERENCES conversations(id)
    ON DELETE CASCADE
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,  -- Clerk user ID
  plan TEXT NOT NULL DEFAULT 'free',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'inactive',
  daily_message_limit INTEGER DEFAULT 5,
  history_days INTEGER DEFAULT 7,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

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

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_user_id_date ON user_usage(user_id, date);

-- Add RLS policies
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update their own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete their own conversations" ON conversations;

-- Create new policies using JWT claims from Clerk
CREATE POLICY "Users can create their own conversations"
  ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (auth.jwt()->>'sub')::text);

CREATE POLICY "Users can view their own conversations"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (user_id = (auth.jwt()->>'sub')::text);

CREATE POLICY "Users can update their own conversations"
  ON conversations
  FOR UPDATE
  TO authenticated
  USING (user_id = (auth.jwt()->>'sub')::text);

CREATE POLICY "Users can delete their own conversations"
  ON conversations
  FOR DELETE
  TO authenticated
  USING (user_id = (auth.jwt()->>'sub')::text);

-- Messages table policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can create messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;

-- Create new policies using JWT claims from Clerk
CREATE POLICY "Users can create messages in their conversations"
  ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = messages.conversation_id
      AND user_id = (auth.jwt()->>'sub')::text
    )
  );

CREATE POLICY "Users can view messages in their conversations"
  ON messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE id = messages.conversation_id
      AND user_id = (auth.jwt()->>'sub')::text
    )
  );

-- Subscription table policies
CREATE POLICY "Users can view their own subscriptions"
  ON subscriptions
  FOR SELECT
  TO authenticated
  USING (user_id = (auth.jwt()->>'sub')::text);

CREATE POLICY "Users can update their own subscriptions"
  ON subscriptions
  FOR UPDATE
  TO authenticated
  USING (user_id = (auth.jwt()->>'sub')::text);

-- Allow service role to manage all subscriptions (for webhook handling)
CREATE POLICY "Service role can manage all subscriptions"
  ON subscriptions
  USING (auth.role() = 'service_role');

-- User usage table policies
DROP POLICY IF EXISTS "Users can view their own usage" ON user_usage;
DROP POLICY IF EXISTS "Users can insert their own usage" ON user_usage;
DROP POLICY IF EXISTS "Users can update their own usage" ON user_usage;
DROP POLICY IF EXISTS "Service role can manage all usage records" ON user_usage;

CREATE POLICY "Users can view their own usage"
  ON user_usage
  FOR SELECT
  TO authenticated
  USING (user_id = (auth.jwt()->>'sub')::text);

CREATE POLICY "Users can insert their own usage"
  ON user_usage
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (auth.jwt()->>'sub')::text);

CREATE POLICY "Users can update their own usage"
  ON user_usage
  FOR UPDATE
  TO authenticated
  USING (user_id = (auth.jwt()->>'sub')::text);

-- Allow service role to manage all usage records
CREATE POLICY "Service role can manage all usage records"
  ON user_usage
  USING (auth.role() = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on conversations
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON conversations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on subscriptions
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Trigger to update updated_at on user_usage
DROP TRIGGER IF EXISTS update_user_usage_updated_at ON user_usage;
CREATE TRIGGER update_user_usage_updated_at
BEFORE UPDATE ON user_usage
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
