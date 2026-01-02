#!/bin/bash

# ==================== SSL Certificate Setup Script ====================
# Sets up Let's Encrypt SSL certificates using Certbot

set -e

echo "========================================="
echo "SSL Certificate Setup"
echo "========================================="

# Get domain name
read -p "Enter your primary domain (e.g., workmonitor.com): " DOMAIN
read -p "Enter www domain (e.g., www.workmonitor.com): " WWW_DOMAIN
read -p "Enter API subdomain (e.g., api.workmonitor.com): " API_DOMAIN
read -p "Enter your email for SSL certificate notifications: " EMAIL

# Stop Nginx temporarily
echo "Stopping Nginx..."
sudo systemctl stop nginx

# Obtain SSL certificate
echo "Obtaining SSL certificate..."
sudo certbot certonly --standalone \
    -d $DOMAIN \
    -d $WWW_DOMAIN \
    -d $API_DOMAIN \
    --non-interactive \
    --agree-tos \
    --email $EMAIL

# Start Nginx
echo "Starting Nginx..."
sudo systemctl start nginx

# Set up auto-renewal
echo "Setting up automatic renewal..."
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test renewal
echo "Testing certificate renewal..."
sudo certbot renew --dry-run

echo "========================================="
echo "SSL Setup Complete!"
echo "========================================="
echo ""
echo "Your website is now secured with HTTPS:"
echo "  https://$DOMAIN"
echo "  https://$WWW_DOMAIN"
echo "  https://$API_DOMAIN"
echo ""
echo "Certificates will auto-renew via certbot.timer"
echo ""
