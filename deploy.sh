#!/bin/bash

# Firebase Deploy Script for SiK Radio Configurator
# Syncs files from Flask app to public folder, then deploys to Firebase

set -e  # Exit on any error

echo "🔄 Syncing files from Flask app to public folder..."

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Define source and destination paths
FLASK_STATIC="$SCRIPT_DIR/app/static"
FLASK_TEMPLATES="$SCRIPT_DIR/app/templates"
PUBLIC_DIR="$SCRIPT_DIR/public"

# Sync CSS
echo "   📄 Copying styles.css..."
cp "$FLASK_STATIC/css/styles.css" "$PUBLIC_DIR/css/styles.css"

# Sync JavaScript
echo "   📄 Syncing JavaScript..."
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete "$FLASK_STATIC/js/" "$PUBLIC_DIR/js/"
else
  rm -rf "$PUBLIC_DIR/js"
  mkdir -p "$PUBLIC_DIR/js"
  cp -R "$FLASK_STATIC/js/." "$PUBLIC_DIR/js/"
fi

# Sync HTML (convert Jinja2 paths to relative paths)
echo "   📄 Syncing index.html..."
sed -e "s|{{ url_for('static', filename='css/styles.css') }}|css/styles.css|g" \
    -e "s|{{ url_for('static', filename='js/main.js') }}|js/main.js|g" \
    "$FLASK_TEMPLATES/index.html" > "$PUBLIC_DIR/index.html"

echo "✅ Files synced successfully!"
echo ""

# Deploy to Firebase
echo "🚀 Deploying to Firebase..."
npx firebase deploy --only hosting

echo ""
echo "✨ Deployment complete!"
