#!/bin/bash

# Switch to Node.js 18 or higher
echo "Switching to Node.js 18 LTS..."
nvm use 18 || nvm install 18

# Install dependencies using pnpm
echo "Installing dependencies with pnpm..."
pnpm install

# Start the development server
echo "Starting the development server..."
echo "You can now access the application at http://localhost:3000"
pnpm dev
