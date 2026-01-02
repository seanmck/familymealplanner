#!/bin/bash

# FamilyTable Development Stop Script
# Stops all development components

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"

echo "🛑 Stopping FamilyTable development environment..."
echo ""

# Stop PostgreSQL
echo "📦 Stopping PostgreSQL database..."
docker compose down

echo ""
echo "✅ All components stopped"
