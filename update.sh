#!/bin/bash
# Update script for PulseChainRamp

echo "--- PulseChainRamp Update Script ---"

echo "[1/7] Listing current forever processes..."
forever list

echo "[2/7] Attempting to stop PulseChainRamp application (index.js)..."
forever stop index.js || echo "Info: PulseChainRamp (index.js) was not running or could not be stopped."

echo "[3/7] Pulling latest code from git repository..."
git pull

echo "[4/7] Installing/updating NPM dependencies (production only)..."
npm install --production

echo "[5/7] Starting PulseChainRamp application in production mode..."
NODE_ENV=production forever start index.js

echo "[6/7] Listing active forever processes after restart..."
forever list

echo "[7/7] Tailing logs for PulseChainRamp (index.js). Press Ctrl+C to stop tailing."
forever logs index.js -f

echo "--- Script finished ---"
