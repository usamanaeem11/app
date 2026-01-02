#!/bin/bash

# Setup standalone PostgreSQL for Working Tracker on Contabo VPS
# This script installs and configures PostgreSQL independently

set -e

echo "==================================="
echo "Working Tracker PostgreSQL Setup"
echo "==================================="

# Update system
echo "Updating system packages..."
apt update && apt upgrade -y

# Install PostgreSQL
echo "Installing PostgreSQL..."
apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
echo "Starting PostgreSQL service..."
systemctl start postgresql
systemctl enable postgresql

# Generate random password
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

# Create database and user
echo "Creating database and user..."
sudo -u postgres psql << EOF
-- Create user
CREATE USER workmonitor_user WITH PASSWORD '$DB_PASSWORD';

-- Create database
CREATE DATABASE workmonitor OWNER workmonitor_user;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE workmonitor TO workmonitor_user;

-- Connect to database and set permissions
\c workmonitor
GRANT ALL ON SCHEMA public TO workmonitor_user;
ALTER SCHEMA public OWNER TO workmonitor_user;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Exit
\q
EOF

# Configure PostgreSQL for remote connections (if needed)
PG_VERSION=$(psql --version | awk '{print $3}' | cut -d. -f1)
PG_CONF="/etc/postgresql/$PG_VERSION/main/postgresql.conf"
PG_HBA="/etc/postgresql/$PG_VERSION/main/pg_hba.conf"

# Backup original files
cp $PG_CONF ${PG_CONF}.backup
cp $PG_HBA ${PG_HBA}.backup

# Configure PostgreSQL to listen on all interfaces (optional - for remote access)
echo "Configuring PostgreSQL..."
sed -i "s/#listen_addresses = 'localhost'/listen_addresses = '*'/" $PG_CONF

# Add host authentication (allow password authentication from local network)
echo "host    workmonitor    workmonitor_user    127.0.0.1/32    md5" >> $PG_HBA
echo "host    workmonitor    workmonitor_user    ::1/128         md5" >> $PG_HBA

# Restart PostgreSQL
systemctl restart postgresql

# Save connection details
cat > /opt/workmonitor/postgres-credentials.txt << EOF
=================================
PostgreSQL Connection Details
=================================
Host: localhost
Port: 5432
Database: workmonitor
Username: workmonitor_user
Password: $DB_PASSWORD

Connection String:
postgresql://workmonitor_user:$DB_PASSWORD@localhost:5432/workmonitor

DATABASE_URL=postgresql://workmonitor_user:$DB_PASSWORD@localhost:5432/workmonitor
=================================
EOF

chmod 600 /opt/workmonitor/postgres-credentials.txt

echo ""
echo "✅ PostgreSQL setup complete!"
echo ""
echo "📝 Connection details saved to: /opt/workmonitor/postgres-credentials.txt"
echo ""
echo "Add this to your .env file:"
echo "DATABASE_URL=postgresql://workmonitor_user:$DB_PASSWORD@localhost:5432/workmonitor"
echo ""
