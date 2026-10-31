#!/bin/bash
# Dropp Super-App — Master 4-Simulator Launcher

echo "🚀 Preparing Dropp 4-Simulator Fleet..."

DEV_CUSTOMER="A6ED74F6-58E8-4246-9356-0DA6BCCBE55F"
DEV_DRIVER="1B252EAB-D89F-4753-B430-DF07407BA8E5"
DEV_DELIVERY="1D2BAB97-C628-4B3A-949E-5EA4E1229400"
DEV_SELLER="E92C2940-85E6-4716-AA05-5162794F5856"

# 1. Clean Status Bars (Keynote Mode 9:41 AM, 100% battery) + Permissions
for dev in "$DEV_CUSTOMER" "$DEV_DRIVER" "$DEV_DELIVERY" "$DEV_SELLER"; do
  xcrun simctl status_bar "$dev" override --time "9:41" --batteryState charged --batteryLevel 100 --wifiBars 3 --cellularBars 4 2>/dev/null
  xcrun simctl privacy "$dev" grant all host.exp.Exponent 2>/dev/null || true
  xcrun simctl privacy "$dev" grant location host.exp.Exponent 2>/dev/null || true
  xcrun simctl privacy "$dev" grant location-always host.exp.Exponent 2>/dev/null || true
  xcrun simctl privacy "$dev" grant microphone host.exp.Exponent 2>/dev/null || true
  xcrun simctl privacy "$dev" grant speech-recognition host.exp.Exponent 2>/dev/null || true
done

echo "🌐 Connecting simulators to live bundlers..."

# Customer App (:8081) -> iPhone 17 Pro
xcrun simctl openurl "$DEV_CUSTOMER" exp://127.0.0.1:8081 2>/dev/null || true

# Cab Driver (:8082) -> iPhone 17
xcrun simctl openurl "$DEV_DRIVER" exp://127.0.0.1:8082 2>/dev/null || true

# Delivery Partner (:8082) -> iPhone Air
xcrun simctl openurl "$DEV_DELIVERY" exp://127.0.0.1:8082 2>/dev/null || true

# Seller App (:8084) -> iPhone 17 Pro Max
xcrun simctl openurl "$DEV_SELLER" exp://127.0.0.1:8084 2>/dev/null || true

echo "✨ All 4 apps launched! Ready for recording."
