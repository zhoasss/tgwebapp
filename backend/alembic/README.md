# Alembic Migrations

This directory contains database migrations managed by Alembic.

## Commands

### Create a new migration
```bash
cd backend
alembic revision --autogenerate -m "Description of changes"
```

### Apply migrations
```bash
cd backend
alembic upgrade head
```

### Rollback last migration
```bash
cd backend
alembic downgrade -1
```

### View migration history
```bash
cd backend
alembic history
```

### View current revision
```bash
cd backend
alembic current
```

## Migration Files

Migration files are stored in `versions/` directory and are automatically generated based on model changes.
