#!/bin/bash

# FamilyTable Development Startup Script
# Starts all components needed for local development

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "🍽️  Starting FamilyTable development environment..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker and try again."
    exit 1
fi

# Start PostgreSQL (or use existing container from another worktree)
if docker ps --format '{{.Names}}' | grep -q '^familytable-db$'; then
    echo "✅ PostgreSQL already running (reusing existing container)"
else
    echo "📦 Starting PostgreSQL database..."
    docker compose up -d
    echo "⏳ Waiting for PostgreSQL to be ready..."
    until docker exec familytable-db pg_isready -U familytable > /dev/null 2>&1; do
        sleep 1
    done
fi
echo "✅ PostgreSQL is ready"

# Run Prisma migrations
echo ""
echo "🔄 Syncing database schema..."
npx prisma db push --skip-generate

# Generate Prisma client
echo ""
echo "🔧 Generating Prisma client..."
npx prisma generate

# Start the development server
echo ""
echo "🚀 Starting Next.js development server..."
echo ""
npm run dev
