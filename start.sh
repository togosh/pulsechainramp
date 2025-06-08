#!/bin/bash
# Start script for PulseChainRamp

echo "--- PulseChainRamp Start Script ---"

echo "[1/5] Listing current forever processes..."
forever list

echo "[2/5] Attempting to stop any existing PulseChainRamp process (index.js)..."
# This stops the script named 'index.js'. If it's not running, it will show an error, which is fine.
forever stop index.js || echo "Info: PulseChainRamp (index.js) was not running or could not be stopped."

echo "[3/5] Starting PulseChainRamp application in production mode..."
# Assumes index.js is in the current directory where this script is run (project root)
NODE_ENV=production forever start index.js

echo "[4/5] Listing active forever processes after start..."
forever list

echo "[5/5] Tailing logs for PulseChainRamp (index.js). Press Ctrl+C to stop tailing."
# This will show live logs.
forever logs index.js -f

echo "--- Script finished ---"
