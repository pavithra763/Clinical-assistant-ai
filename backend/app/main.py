from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.patient_routes import router as patient_router

app = FastAPI(title="Clinical Assistant API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(patient_router)


@app.get("/")
def root():
    return {"message": "Clinical Assistant API Running"}