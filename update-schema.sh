#!/bin/bash

# Check if Supabase CLI is installed
if ! command -v npx &> /dev/null; then
  echo "Error: npx is not installed. Please install Node.js and npm."
  exit 1
fi

# Set environment variables from .env file if it exists
if [ -f .env ]; then
  echo "Loading environment variables from .env file..."
  export $(grep -v '^#' .env | xargs)
fi

# Check if required environment variables are set
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in your .env file."
  exit 1
fi

# Initialize Supabase project if not already initialized
if [ ! -d "supabase" ]; then
  echo "Initializing Supabase project..."
  npx supabase init
fi

# Check if the user wants to apply the schema directly
if [ "$1" == "--apply" ]; then
  echo "Applying schema.sql to your Supabase project..."
  
  # Use the Supabase REST API to execute the SQL
  SCHEMA_SQL=$(cat supabase/schema.sql)
  
  # Execute the SQL using the Supabase REST API
  curl -X POST "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": \"${SCHEMA_SQL}\"}"
  
  echo -e "\nSchema applied successfully!"
else
  echo "This script will help you update your Supabase schema."
  echo "Options:"
  echo "  --apply    Apply the schema.sql directly to your Supabase project"
  echo ""
  echo "To apply the schema, run: ./update-schema.sh --apply"
  echo ""
  echo "Alternatively, you can copy and paste the SQL below into the Supabase SQL Editor:"
  echo "----------------------------------------"
  cat supabase/schema.sql
  echo "----------------------------------------"
fi

exit 0
