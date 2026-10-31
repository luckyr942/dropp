#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Dropp Multi-Simulator Launch Script
# ─────────────────────────────────────────────────────────────────────────────
# Simulator Layout:
#   iPhone 17 Pro  (A6ED74F6) → Port 8081 → Customer App   (frontend/)
#   iPhone 17      (1B252EAB) → Port 8082 → Cab Driver App  (frontend/driver)
#   iPhone Air     (1D2BAB97) → Port 8083 → Delivery Driver (frontend/driver)
# ─────────────────────────────────────────────────────────────────────────────

IPHONE_17PRO="A6ED74F6-58E8-4246-9356-0DA6BCCBE55F"
IPHONE_17="1B252EAB-D89F-4753-B430-DF07407BA8E5"
IPHONE_AIR="1D2BAB97-C628-4B3A-949E-5EA4E1229400"

ROOT="$(cd "$(dirname "$0")" && pwd)"
CUSTOMER_DIR="$ROOT/frontend"
DRIVER_DIR="$ROOT/frontend/driver"

echo "🚀 Starting Dropp Multi-Simulator Test Environment"
echo "───────────────────────────────────────────────────"
echo "  📱 iPhone 17 Pro  → :8081 (Customer App)"
echo "  🚗 iPhone 17      → :8082 (Cab Captain - Pradeep Bose)"
echo "  🏍️  iPhone Air     → :8083 (Delivery Partner - Rohan Sharma)"
echo "───────────────────────────────────────────────────"

# Kill any existing Expo servers on those ports
lsof -ti:8081 | xargs kill -9 2>/dev/null && echo "♻️  Cleared port 8081"
lsof -ti:8082 | xargs kill -9 2>/dev/null && echo "♻️  Cleared port 8082"
lsof -ti:8083 | xargs kill -9 2>/dev/null && echo "♻️  Cleared port 8083"

# 1. Start Customer App on port 8081 in background
echo ""
echo "▶️  [1/3] Starting Customer App (port 8081)..."
cd "$CUSTOMER_DIR"
EXPO_NO_DOTENV=1 npx expo start --port 8081 --non-interactive &
CUSTOMER_PID=$!
echo "   Customer PID: $CUSTOMER_PID"

# 2. Start Driver App for iPhone 17 on port 8082 in background
echo "▶️  [2/3] Starting Cab Driver App (port 8082)..."
cd "$DRIVER_DIR"
EXPO_NO_DOTENV=1 npx expo start --port 8082 --non-interactive &
CAB_PID=$!
echo "   Cab Driver PID: $CAB_PID"

# 3. Start Driver App for iPhone Air on port 8083 in background
echo "▶️  [3/3] Starting Delivery Driver App (port 8083)..."
cd "$DRIVER_DIR"
EXPO_NO_DOTENV=1 npx expo start --port 8083 --non-interactive &
DELIVERY_PID=$!
echo "   Delivery Driver PID: $DELIVERY_PID"

# Wait for all 3 Metro bundlers to become ready
echo ""
echo "⏳ Waiting 10 seconds for Metro bundlers to initialise..."
sleep 10

# Open each simulator on its dedicated port
echo ""
echo "📲 Launching apps on each simulator..."
xcrun simctl openurl "$IPHONE_17PRO" exp://localhost:8081 && echo "   ✅ iPhone 17 Pro  → Customer App (exp://localhost:8081)"
xcrun simctl openurl "$IPHONE_17"    exp://localhost:8082 && echo "   ✅ iPhone 17      → Cab Driver  (exp://localhost:8082)"
xcrun simctl openurl "$IPHONE_AIR"   exp://localhost:8083 && echo "   ✅ iPhone Air     → Delivery    (exp://localhost:8083)"

echo ""
echo "🎉 All 3 simulators are live!"
echo ""
echo "  📋 Role Setup:"
echo "  • iPhone 17 Pro  → Customer: book a ride + food order"
echo "  • iPhone 17      → Tap ☰ → Switch to Driver → Select 'Pradeep Bose' (Cab)"
echo "  • iPhone Air     → Tap ☰ → Switch to Driver → Select 'Rohan Sharma' (Bike)"
echo ""
echo "  To stop all servers: kill $CUSTOMER_PID $CAB_PID $DELIVERY_PID"
echo "  Or run: lsof -ti:8081,8082,8083 | xargs kill -9"
echo ""

# Keep script alive so you can Ctrl+C to kill all 3 processes cleanly
wait $CUSTOMER_PID $CAB_PID $DELIVERY_PID






