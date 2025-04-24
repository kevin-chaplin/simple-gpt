-- Update RLS policies for user_usage table
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
