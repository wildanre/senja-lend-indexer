#!/bin/bash

# Script untuk testing Position event tracking
# Gunakan script ini setelah indexer berjalan dan ada CreatePosition events

echo "🚀 Testing Position Event Tracking"
echo "=================================="

# Check if ponder is running
if ! pgrep -f "ponder" > /dev/null; then
    echo "❌ Ponder not running. Please start with 'pnpm dev' first."
    exit 1
fi

echo "✅ Ponder is running"

# Simulate calling the position tracking API
echo "📍 Simulating Position event tracking..."

# You can call this via GraphQL API or REST if exposed
# For now, this is a placeholder script

echo "💡 To actually track Position events:"
echo "1. Make sure indexer has processed some CreatePosition events"
echo "2. Call trackPositionEventsAPI() with appropriate block range" 
echo "3. Check logs for SwapTokenByPosition events"

echo ""
echo "🔍 Current known positions will be shown in positionHandlers.ts logs"
echo "Look for lines starting with '📍 New Position created:'"

echo ""
echo "📊 To see Position events:"
echo "Look for lines starting with '📊 Position ... events:'"