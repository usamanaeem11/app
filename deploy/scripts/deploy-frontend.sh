#!/bin/bash

# ==================== Deploy Frontend Script ====================
# Builds and deploys the React frontend to production

set -e

DEPLOY_DIR="/var/www/workmonitor"
FRONTEND_DIR="$DEPLOY_DIR/frontend"

echo "========================================="
echo "Deploying WorkMonitor Frontend"
echo "========================================="

# Navigate to frontend directory
cd $FRONTEND_DIR

# Install dependencies
echo "Installing Node.js dependencies..."
npm ci --only=production

# Build production bundle
echo "Building production bundle..."
npm run build

# Set permissions
chown -R www-data:www-data $FRONTEND_DIR/build

# Install Nginx configuration
echo "Installing Nginx configuration..."
sudo cp $DEPLOY_DIR/deploy/nginx/workmonitor.conf /etc/nginx/sites-available/workmonitor

# Update domain in Nginx config
read -p "Enter your domain name (e.g., workmonitor.com): " DOMAIN
sudo sed -i "s/yourdomain.com/$DOMAIN/g" /etc/nginx/sites-available/workmonitor

# Create symlink if it doesn't exist
if [ ! -L "/etc/nginx/sites-enabled/workmonitor" ]; then
    sudo ln -s /etc/nginx/sites-available/workmonitor /etc/nginx/sites-enabled/
fi

# Test Nginx configuration
echo "Testing Nginx configuration..."
sudo nginx -t

# Reload Nginx
echo "Reloading Nginx..."
sudo systemctl reload nginx

echo "========================================="
echo "Frontend deployment complete!"
echo "========================================="
echo ""
echo "Your website should now be accessible at http://$DOMAIN"
echo "Run setup-ssl.sh to enable HTTPS"
echo ""
