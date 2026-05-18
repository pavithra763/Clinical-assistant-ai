from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routes.routes import (
    router_roles,
    router_users,
    router_doctors,
    router_schedules,
    router_patients,
    router_vitals,
    router_prescriptions,
    router_appointments,
    router_consultations,
    router_audit,
)


from app.routes.auth_routes import router_auth



# ─────────────────────────────────────────────
# Lifespan — runs on startup / shutdown
# ─────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables if they don't exist yet (dev convenience).
    # In production, replace this with Alembic migrations.
    Base.metadata.create_all(bind=engine)
    yield
    # Add any shutdown cleanup here (close connections, flush caches, etc.)

# ─────────────────────────────────────────────
# App instance
# ─────────────────────────────────────────────

app = FastAPI(
    title="Clinic Management API",
    description="REST API for managing doctors, patients, appointments, consultations, and more.",
    version="1.0.0",
    lifespan=lifespan,
)

# ─────────────────────────────────────────────
# CORS
# ─────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # Restrict to specific origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# Routers
# ─────────────────────────────────────────────

app.include_router(router_auth,          prefix="/api/v1")
app.include_router(router_roles,         prefix="/api/v1")
app.include_router(router_users,         prefix="/api/v1")
app.include_router(router_doctors,       prefix="/api/v1")
app.include_router(router_schedules,     prefix="/api/v1")
app.include_router(router_patients,      prefix="/api/v1")
app.include_router(router_vitals,        prefix="/api/v1")
app.include_router(router_prescriptions, prefix="/api/v1")
app.include_router(router_appointments,  prefix="/api/v1")
app.include_router(router_consultations, prefix="/api/v1")
app.include_router(router_audit,         prefix="/api/v1")

# ─────────────────────────────────────────────
# Health check
# ─────────────────────────────────────────────

@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}