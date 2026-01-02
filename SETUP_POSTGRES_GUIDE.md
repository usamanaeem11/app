# PostgreSQL Setup Guide for Contabo VPS

This guide will help you set up an independent PostgreSQL database for Working Tracker on your Contabo VPS with CloudPanel.

## Overview

The system now supports both:
- **Supabase** (managed database)
- **Standalone PostgreSQL** (self-hosted on your VPS)

The database type is auto-detected based on environment variables.

## Step 1: Install and Configure PostgreSQL

SSH into your Contabo VPS and run the setup script:

```bash
cd /opt/workmonitor
chmod +x deploy/scripts/setup-postgres.sh
sudo ./deploy/scripts/setup-postgres.sh
```

This script will:
- Install PostgreSQL and required extensions
- Create the `workmonitor` database and user
- Configure PostgreSQL for local connections
- Generate secure credentials
- Save connection details to `/opt/workmonitor/postgres-credentials.txt`

## Step 2: Create Database Schema

After PostgreSQL is installed, create the database tables:

```bash
# Connect to PostgreSQL
sudo -u postgres psql -d workmonitor

# Run the schema file
\i /opt/workmonitor/deploy/sql/postgres-schema.sql

# Exit
\q
```

## Step 3: Update Environment Variables

Edit your backend `.env` file:

```bash
nano /opt/workmonitor/backend/.env
```

Add the DATABASE_URL (get it from `/opt/workmonitor/postgres-credentials.txt`):

```env
# Standalone PostgreSQL
DATABASE_URL=postgresql://workmonitor_user:YOUR_PASSWORD@localhost:5432/workmonitor

# Remove or comment out Supabase variables to use standalone PostgreSQL
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...
```

## Step 4: Install Python Dependencies

```bash
cd /opt/workmonitor/backend
source /opt/workmonitor/venv/bin/activate
pip install psycopg2-binary
```

## Step 5: Test the Connection

Test that the backend can connect to PostgreSQL:

```bash
cd /opt/workmonitor/backend
python -c "from db import get_db; print('Database connected successfully!')"
```

## Step 6: Restart the Backend

```bash
sudo systemctl restart workmonitor-backend
sudo systemctl status workmonitor-backend
```

## Database Type Detection

The system automatically detects which database to use:

- **If `DATABASE_URL` is set and `VITE_SUPABASE_URL` is not set**: Uses standalone PostgreSQL
- **If `VITE_SUPABASE_URL` is set**: Uses Supabase

## Database Adapter Features

The standalone PostgreSQL adapter (`backend/utils/postgres_adapter.py`) provides:

- Connection pooling for performance
- Async/await support
- Transaction management
- Error handling and logging
- Full compatibility with existing codebase

## Backup and Maintenance

### Create a Backup

```bash
sudo -u postgres pg_dump workmonitor > /opt/workmonitor/backups/workmonitor_$(date +%Y%m%d_%H%M%S).sql
```

### Restore from Backup

```bash
sudo -u postgres psql workmonitor < /opt/workmonitor/backups/workmonitor_backup.sql
```

### Monitor Database

```bash
# Check database size
sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('workmonitor'));"

# Check active connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity WHERE datname='workmonitor';"

# View tables
sudo -u postgres psql -d workmonitor -c "\dt"
```

## Performance Tuning

Edit PostgreSQL configuration:

```bash
sudo nano /etc/postgresql/*/main/postgresql.conf
```

Recommended settings for a 4GB VPS:

```conf
shared_buffers = 1GB
effective_cache_size = 3GB
maintenance_work_mem = 256MB
work_mem = 16MB
max_connections = 100
```

Restart PostgreSQL:

```bash
sudo systemctl restart postgresql
```

## Security Best Practices

1. **Strong Password**: The setup script generates a secure random password
2. **Firewall**: PostgreSQL should only listen on localhost (default)
3. **Regular Backups**: Set up automated daily backups
4. **Updates**: Keep PostgreSQL updated
   ```bash
   sudo apt update && sudo apt upgrade postgresql
   ```

## Troubleshooting

### Connection Issues

Check if PostgreSQL is running:
```bash
sudo systemctl status postgresql
```

Check logs:
```bash
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### Permission Issues

Grant permissions:
```bash
sudo -u postgres psql -d workmonitor
GRANT ALL PRIVILEGES ON DATABASE workmonitor TO workmonitor_user;
GRANT ALL ON SCHEMA public TO workmonitor_user;
\q
```

### Port Already in Use

Check what's using port 5432:
```bash
sudo lsof -i :5432
```

## Migration from Supabase to Standalone PostgreSQL

To migrate from Supabase to standalone PostgreSQL:

1. **Export data from Supabase**:
   - Use Supabase dashboard to export tables as SQL

2. **Import to standalone PostgreSQL**:
   ```bash
   sudo -u postgres psql workmonitor < supabase_export.sql
   ```

3. **Update environment variables** as described in Step 3

4. **Test thoroughly** before switching in production

## CloudPanel Integration

If you're using CloudPanel:

1. You can manage PostgreSQL through CloudPanel's phpPgAdmin (if installed)
2. Create a CloudPanel site for the frontend
3. Use CloudPanel's reverse proxy for the backend API

## Next Steps

After setting up PostgreSQL:

1. Update your frontend environment variables
2. Test all functionality (user registration, time tracking, etc.)
3. Set up automated backups
4. Configure monitoring alerts
5. Plan for regular maintenance windows

## Support

For issues:
- Check logs: `/var/log/postgresql/`
- Backend logs: `journalctl -u workmonitor-backend -f`
- PostgreSQL documentation: https://www.postgresql.org/docs/
