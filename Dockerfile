FROM node:24-slim AS frontend

WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM python:3.14-slim

WORKDIR /app

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./

COPY --from=frontend /frontend/dist /frontend/dist

# Three steps, in this order, on every boot:
#   provision  creates app_user and reconciles its password to APP_DB_PASSWORD,
#              so rotating that variable needs only a redeploy
#   upgrade    applies migrations, including the grants app_user depends on
#   uvicorn    serves as app_user, the restricted role, so RLS applies
CMD ["sh", "-c", "python -m app.provision && alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
