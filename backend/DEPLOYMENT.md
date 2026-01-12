# Backend Deployment Guide

## Production Settings with Docker Volumes

This application uses volume-mapped settings files instead of environment variables for production deployments.

### How It Works

- **Development**: Uses [src/barfik_backend/settings.py](src/barfik_backend/settings.py) with SQLite and DEBUG=True
- **Production**: Uses a custom settings file mapped as a Docker volume

### Setting Up Production

1. **Create your production settings file:**

   ```bash
   cp settings_production.py.example settings_production.py
   ```

2. **Edit `settings_production.py` with your production values:**

   - `SECRET_KEY`: Generate a new secret key
     ```bash
     python -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())'
     ```
   - `ALLOWED_HOSTS`: Add your domain(s)
   - `DATABASES`: Update database credentials (HOST should be 'barfik-db' to match Docker service name)
   - `CORS_ALLOWED_ORIGINS`: Add your frontend domain(s)
   - `CSRF_TRUSTED_ORIGINS`: Add your domain(s)
   - Update API server URLs in `SPECTACULAR_SETTINGS`

3. **The Docker volume mapping** (already configured in [docker-compose.yml](../docker-compose.yml)):
   ```yaml
   volumes:
     - ./backend/settings_production.py:/app/barfik_backend/settings.py:ro
   ```

4. **Start the services:**
   ```bash
   docker-compose up -d
   ```

### Important Notes

- ✅ The production settings file is **NOT** committed to git (see [.gitignore](../.gitignore))
- ✅ The settings file is mounted as **read-only** (`:ro`) in the container
- ✅ No environment variables needed for Django settings
- ✅ Each deployment can have its own settings file
- ⚠️ Keep your `settings_production.py` file secure with proper file permissions
- ⚠️ Always use HTTPS in production and enable security settings

### Database Configuration

The production settings expect PostgreSQL with these defaults:
- **Host**: `barfik-db` (Docker service name)
- **Port**: `5432`
- **Database**: `barfik`
- **User**: `barfik_user`

Make sure these match your `docker-compose.yml` database service configuration.

### Updating Settings

To update production settings:

1. Edit your local `settings_production.py` file
2. Restart the backend container:
   ```bash
   docker-compose restart barfik-backend
   ```

### Security Checklist

Before deploying to production, ensure:

- [ ] `SECRET_KEY` is randomly generated and kept secure
- [ ] `DEBUG = False`
- [ ] `ALLOWED_HOSTS` contains only your actual domains
- [ ] Database password is strong and secure
- [ ] `CORS_ALLOWED_ORIGINS` includes only trusted domains
- [ ] SSL/TLS is enabled (`CSRF_COOKIE_SECURE = True`, etc.)
- [ ] File permissions on `settings_production.py` are restricted (e.g., `chmod 600`)

### Troubleshooting

**Container fails to start:**
- Check that `settings_production.py` exists in the `backend/` directory
- Verify the file has correct Python syntax
- Check Docker logs: `docker-compose logs barfik-backend`

**Database connection errors:**
- Ensure database credentials in settings match `docker-compose.yml`
- Verify the database service is healthy: `docker-compose ps`
- Check database host is set to `barfik-db` (Docker service name)

**Static files not loading:**
- Run collectstatic: `docker-compose exec barfik-backend python manage.py collectstatic --noinput`
- Verify volume mapping for `static_volume` in docker-compose
