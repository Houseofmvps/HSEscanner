#!/usr/bin/env bash
# Unified Build Script for Render
# Builds React frontend and copies to backend/static

set -e

echo "📦 Installing frontend dependencies..."
cd frontend
yarn install

echo "🔨 Building React frontend..."
yarn build

echo "📁 Copying build to backend/static..."
cd ..
rm -rf backend/static
cp -r frontend/build backend/static

echo "📦 Installing backend dependencies..."
cd backend
pip install -r requirements.txt

echo "✅ Build complete!"
