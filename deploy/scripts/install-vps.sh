#!/bin/bash

# ==================== WorkMonitor VPS Installation Script ====================
# For Ubuntu 20.04/22.04 on Contabo/Hostinger VPS
# Run as root or with sudo privileges

set -e

echo "========================================="
echo "WorkMonitor VPS Installation"
echo "========================================="

# Update system
echo "Updating system packages..."
apt-get update
apt-get upgrade -y

# Install required packages
echo "Installing required packages..."
apt-get install -y \
    python3.11 \
    python3-pip \
    python3-venv \
    nginx \
    certbot \
    python3-certbot-nginx \
    git \
    curl \
    ufw \
    fail2ban \
    nodejs \
    npm

# Install Node.js 18 LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Create directories
echo "Creating directories..."
mkdir -p /var/www/workmonitor
mkdir -p /var/log/workmonitor
mkdir -p /var/www/certbot

# Set permissions
chown -R www-data:www-data /var/www/workmonitor
chown -R www-data:www-data /var/log/workmonitor

# Configure firewall
echo "Configuring firewall..."
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow http
ufw allow https
ufw --force enable

# Configure fail2ban
echo "Configuring fail2ban..."
systemctl enable fail2ban
systemctl start fail2ban

echo "========================================="
echo "Base system setup complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Clone your repository to /var/www/workmonitor"
echo "2. Run deploy-backend.sh"
echo "3. Run deploy-frontend.sh"
echo "4. Run setup-ssl.sh"
echo ""
