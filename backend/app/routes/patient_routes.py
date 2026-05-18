from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.models import Patient
from app.schemas.patient import PatientCreate, PatientResponse

router = APIRouter(prefix="/patients", tags=["Patients"])

@router_patients.get("/", response_model=List[PatientOut])
def list_patients(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    name: Optional[str] = Query(None),
    phone: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Patient)
    if name:
        q = q.filter(Patient.name.ilike(f"%{name}%"))
    if phone:
        q = q.filter(Patient.phone == phone)
    return q.offset(skip).limit(limit).all()

@router.post("/", response_model=PatientResponse)
def create_patient(
    patient: PatientCreate,
    db: Session = Depends(get_db)
):
    db_patient = Patient(**patient.dict())

    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)

    return db_patient

@router.get("/getpatient", response_model=List[PatientResponse])
def get_patients(db: Session = Depends(get_db)):
    return db.query(Patient).all()

@router.get("/{patient_id}", response_model=PatientResponse)
def get_patient(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(
        Patient.id == patient_id
    ).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    return patient


@router.put("/{patient_id}", response_model=PatientResponse)
def update_patient(
    patient_id: str,
    patient_data: PatientCreate,
    db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(
        Patient.id == patient_id
    ).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    for key, value in patient_data.dict().items():
        setattr(patient, key, value)

    db.commit()
    db.refresh(patient)

    return patient


@router.delete("/{patient_id}")
def delete_patient(patient_id: str, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(
        Patient.id == patient_id
    ).first()

    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    db.delete(patient)
    db.commit()

    return {"message": "Patient deleted successfully"}