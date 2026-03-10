#!/bin/bash
echo "🚀 Diagnostic Start Script Running"
echo "Current directory: $(pwd)"
echo "Node version: $(node -v)"
echo "NPM version: $(npm -v)"
echo "PORT env: $PORT"
echo "NODE_ENV: $NODE_ENV"
echo "--- Listing backend directory contents ---"
ls -la
echo "--- Attempting to run server.js ---"
node server.js