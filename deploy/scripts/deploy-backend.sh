#!/bin/bash

# ==================== Deploy Backend Script ====================
# Deploys the Python FastAPI backend to production

set -e

DEPLOY_DIR="/var/www/workmonitor"
BACKEND_DIR="$DEPLOY_DIR/backend"
VENV_DIR="$DEPLOY_DIR/venv"

echo "========================================="
echo "Deploying WorkMonitor Backend"
echo "========================================="

# Navigate to backend directory
cd $BACKEND_DIR

# Create virtual environment if it doesn't exist
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating Python virtual environment..."
    python3.11 -m venv $VENV_DIR
fi

# Activate virtual environment
source $VENV_DIR/bin/activate

# Install dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Copy environment file if it doesn't exist
if [ ! -f "$DEPLOY_DIR/.env.production" ]; then
    echo "Creating .env.production file..."
    cp $DEPLOY_DIR/.env.production.example $DEPLOY_DIR/.env.production
    echo "Please edit /var/www/workmonitor/.env.production with your actual values"
    exit 1
fi

# Set permissions
chown -R www-data:www-data $DEPLOY_DIR
chmod 600 $DEPLOY_DIR/.env.production

# Copy systemd service file
echo "Installing systemd service..."
sudo cp $DEPLOY_DIR/deploy/systemd/workmonitor-backend.service /etc/systemd/system/
sudo systemctl daemon-reload

# Enable and start service
echo "Starting backend service..."
sudo systemctl enable workmonitor-backend
sudo systemctl restart workmonitor-backend

# Check status
sudo systemctl status workmonitor-backend --no-pager

echo "========================================="
echo "Backend deployment complete!"
echo "========================================="
echo ""
echo "Check logs with:"
echo "  sudo journalctl -u workmonitor-backend -f"
echo "  tail -f /var/log/workmonitor/backend.log"
echo ""
