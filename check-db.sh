#!/bin/bash

# MongoDB Atlas Connection Checker

echo "🔍 Checking MongoDB Atlas Connection..."
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    echo "💡 Copy .env.example to .env and fill in your values"
    exit 1
fi

# Check if MONGO_URI is set
if ! grep -q "MONGO_URI=" .env; then
    echo "❌ MONGO_URI not found in .env"
    exit 1
fi

echo "✅ .env file found"
echo ""
echo "📋 MongoDB Connection Details:"
grep "MONGO_URI=" .env | grep -o "@[^?]*" | cut -d@ -f2
echo ""

echo "🚀 Starting server to test connection..."
echo "   (Wait for connection message or error)"
echo ""

npm start
