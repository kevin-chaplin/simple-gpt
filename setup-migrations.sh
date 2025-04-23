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

# Initialize Supabase project if not already initialized
if [ ! -d "supabase" ]; then
  echo "Initializing Supabase project..."
  npx supabase init
fi

# Create a new migration for the schema changes
echo "Creating a new migration for the schema changes..."
TIMESTAMP=$(date +%Y%m%d%H%M%S)
MIGRATION_NAME="update_rls_policies"
MIGRATION_FILE="supabase/migrations/${TIMESTAMP}_${MIGRATION_NAME}.sql"

# Create migrations directory if it doesn't exist
mkdir -p supabase/migrations

# Copy the schema.sql content to the migration file
cp supabase/schema.sql "$MIGRATION_FILE"

echo "Migration file created: $MIGRATION_FILE"
echo ""
echo "Next steps:"
echo "1. Link your local project to your Supabase project:"
echo "   npx supabase link --project-ref <your-project-ref>"
echo ""
echo "2. Push your migrations to your Supabase project:"
echo "   npx supabase db push"
echo ""
echo "For more information, visit: https://supabase.com/docs/guides/local-development/overview"

exit 0
