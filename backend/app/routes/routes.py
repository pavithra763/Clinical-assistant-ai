import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.models.models import (
    Role, User, Doctor, DoctorSchedule,
    Patient, Vitals, Prescription,
    Appointment, ConsultationRecord, AuditLog,
    AppointmentStatus as AppointmentStatusModel,
)
from app.schemas.schemas import (
    RoleCreate, RoleUpdate, RoleOut,
    UserCreate, UserUpdate, UserOut,
    DoctorCreate, DoctorUpdate, DoctorOut,
    DoctorScheduleCreate, DoctorScheduleUpdate, DoctorScheduleOut,
    PatientCreate, PatientUpdate, PatientOut,
    VitalsCreate, VitalsUpdate, VitalsOut,
    PrescriptionCreate, PrescriptionUpdate, PrescriptionOut,
    AppointmentCreate, AppointmentUpdate, AppointmentOut,
    ConsultationRecordCreate, ConsultationRecordUpdate, ConsultationRecordOut,
    AuditLogCreate, AuditLogOut,
)
from passlib.context import CryptContext

import secrets

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ─────────────────────────────────────────────
# 1. Roles
# ─────────────────────────────────────────────

router_roles = APIRouter(prefix="/roles", tags=["Roles"])


@router_roles.get("/", response_model=list[RoleOut])
def list_roles(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return db.query(Role).offset(skip).limit(limit).all()


@router_roles.get("/{role_id}", response_model=RoleOut)
def get_role(role_id: uuid.UUID, db: Session = Depends(get_db)):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    return role


@router_roles.post("/", response_model=RoleOut, status_code=status.HTTP_201_CREATED)
def create_role(payload: RoleCreate, db: Session = Depends(get_db)):
    if db.query(Role).filter(Role.name == payload.name).first():
        raise HTTPException(status_code=409, detail="Role name already exists")
    role = Role(**payload.model_dump())
    db.add(role)
    db.commit()
    db.refresh(role)
    return role


@router_roles.patch("/{role_id}", response_model=RoleOut)
def update_role(role_id: uuid.UUID, payload: RoleUpdate, db: Session = Depends(get_db)):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(role, field, value)
    db.commit()
    db.refresh(role)
    return role


@router_roles.delete("/{role_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_role(role_id: uuid.UUID, db: Session = Depends(get_db)):
    role = db.query(Role).filter(Role.id == role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="Role not found")
    db.delete(role)
    db.commit()


# ─────────────────────────────────────────────
# 2. Users
# ─────────────────────────────────────────────

router_users = APIRouter(prefix="/users", tags=["Users"])


@router_users.get("/", response_model=list[UserOut])
def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    return (
        db.query(User)
        .options(joinedload(User.role))
        .offset(skip)
        .limit(limit)
        .all()
    )


@router_users.get("/{user_id}", response_model=UserOut)
def get_user(user_id: uuid.UUID, db: Session = Depends(get_db)):
    user = (
        db.query(User)
        .options(joinedload(User.role))
        .filter(User.id == user_id)
        .first()
    )
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router_users.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=409, detail="Email already registered")
    data = payload.model_dump()
    raw_password = data.pop("password")
    user = User(**data, password_hash=pwd_context.hash(raw_password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

# @router_users.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
# def create_user(payload: UserCreate, db: Session = Depends(get_db)):

#     if db.query(User).filter(User.email == payload.email).first():
#         raise HTTPException(status_code=409, detail="Email already registered")

#     data = payload.model_dump()

#     # Generate default password automatically
#     generated_password = secrets.token_hex(8)  # example: a1b2c3d4

#     user = User(
#         **data,
#         password_hash=pwd_context.hash(generated_password)
#     )

#     db.add(user)
#     db.commit()
#     db.refresh(user)

#     return user

@router_users.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: uuid.UUID, payload: UserUpdate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router_users.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(user_id: uuid.UUID, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    db.delete(user)
    db.commit()


# ─────────────────────────────────────────────
# 3. Doctors
# ─────────────────────────────────────────────

router_doctors = APIRouter(prefix="/doctors", tags=["Doctors"])


@router_doctors.get("/", response_model=list[DoctorOut])
def list_doctors(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    specialty: Optional[str] = Query(None),
    is_available: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(Doctor)
    if specialty:
        q = q.filter(Doctor.specialty.ilike(f"%{specialty}%"))
    if is_available is not None:
        q = q.filter(Doctor.is_available == is_available)
    return q.offset(skip).limit(limit).all()


@router_doctors.get("/{doctor_id}", response_model=DoctorOut)
def get_doctor(doctor_id: uuid.UUID, db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    return doctor


@router_doctors.post("/", response_model=DoctorOut, status_code=status.HTTP_201_CREATED)
def create_doctor(payload: DoctorCreate, db: Session = Depends(get_db)):
    doctor = Doctor(**payload.model_dump())
    db.add(doctor)
    db.commit()
    db.refresh(doctor)
    return doctor


@router_doctors.patch("/{doctor_id}", response_model=DoctorOut)
def update_doctor(doctor_id: uuid.UUID, payload: DoctorUpdate, db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(doctor, field, value)
    db.commit()
    db.refresh(doctor)
    return doctor


@router_doctors.delete("/{doctor_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_doctor(doctor_id: uuid.UUID, db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.id == doctor_id).first()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")
    db.delete(doctor)
    db.commit()
    return doctor


# ─────────────────────────────────────────────
# 4. Doctor Schedules
# ─────────────────────────────────────────────

router_schedules = APIRouter(prefix="/doctor-schedules", tags=["Doctor Schedules"])


# @router_schedules.get("/", response_model=list[DoctorScheduleOut])
# def list_schedules(
#     doctor_id: Optional[uuid.UUID] = Query(None),
#     day_of_week: Optional[str] = Query(None),
#     skip: int = Query(0, ge=0),
#     limit: int = Query(20, ge=1, le=100),
#     db: Session = Depends(get_db),
# ):
#     q = db.query(DoctorSchedule)
#     if doctor_id:
#         q = q.filter(DoctorSchedule.doctor_id == doctor_id)
#     if day_of_week:
#         q = q.filter(DoctorSchedule.day_of_week.ilike(day_of_week))
#     return q.offset(skip).limit(limit).all()


@router_schedules.get("/", response_model=list[DoctorScheduleOut])
def list_schedules(
    doctor_id: Optional[uuid.UUID] = Query(None),
    day_of_week: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(DoctorSchedule)
    if doctor_id:
        q = q.filter(DoctorSchedule.doctor_id == doctor_id)
    if day_of_week:
        q = q.filter(DoctorSchedule.day_of_week.ilike(day_of_week))
    schedules = (
        q.order_by(
            DoctorSchedule.day_of_week,
            DoctorSchedule.start_time
        ).all()
    )
    return schedules


@router_schedules.get("/{schedule_id}", response_model=DoctorScheduleOut)
def get_schedule(schedule_id: uuid.UUID, db: Session = Depends(get_db)):
    schedule = db.query(DoctorSchedule).filter(DoctorSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return schedule


@router_schedules.post("/", response_model=DoctorScheduleOut, status_code=status.HTTP_201_CREATED)
def create_schedule(payload: DoctorScheduleCreate, db: Session = Depends(get_db)):
    if not db.query(Doctor).filter(Doctor.id == payload.doctor_id).first():
        raise HTTPException(status_code=404, detail="Doctor not found")
    schedule = DoctorSchedule(**payload.model_dump())
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule

@router_schedules.delete("/doctor/{doctor_id}")
def delete_doctor_schedules(
    doctor_id: uuid.UUID,
    db: Session = Depends(get_db)
):

    schedules = (
        db.query(DoctorSchedule)
        .filter(DoctorSchedule.doctor_id == doctor_id)
        .all()
    )

    for schedule in schedules:
        db.delete(schedule)

    db.commit()

    return {
        "message": "Doctor schedules deleted successfully"
    }

@router_schedules.patch("/{schedule_id}", response_model=DoctorScheduleOut)
def update_schedule(schedule_id: uuid.UUID, payload: DoctorScheduleUpdate, db: Session = Depends(get_db)):
    schedule = db.query(DoctorSchedule).filter(DoctorSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(schedule, field, value)
    db.commit()
    db.refresh(schedule)
    return schedule

@router_schedules.delete("/{schedule_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_schedule(schedule_id: uuid.UUID, db: Session = Depends(get_db)):
    schedule = db.query(DoctorSchedule).filter(DoctorSchedule.id == schedule_id).first()
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    db.delete(schedule)
    db.commit()


@router_schedules.get("/doctors/available-today")
async def available_doctors_today():

    conn = await asyncpg.connect(DATABASE_URL)

    today = datetime.now().strftime("%A")
    # Example -> Monday

    query = """
    SELECT 
        d.id,
        d.name,
        d.specialty,
        d.phone,
        ds.day_of_week,
        ds.start_time,
        ds.end_time,
        ds.room
    FROM doctors d
    JOIN doctor_schedules ds
        ON d.id = ds.doctor_id
    WHERE 
        d.is_available = true
        AND ds.day_of_week = $1
    ORDER BY ds.start_time
    """

    rows = await conn.fetch(query, today)

    await conn.close()

    return [dict(row) for row in rows]

# ─────────────────────────────────────────────
# 5. Patients
# ─────────────────────────────────────────────

router_patients = APIRouter(prefix="/patients", tags=["Patients"])


@router_patients.get("/", response_model=list[PatientOut])
def list_patients(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
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


@router_patients.get("/{patient_id}", response_model=PatientOut)
def get_patient(patient_id: uuid.UUID, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return patient


@router_patients.post("/", response_model=PatientOut, status_code=status.HTTP_201_CREATED)
def create_patient(payload: PatientCreate, db: Session = Depends(get_db)):
    patient = Patient(**payload.model_dump())
    db.add(patient)
    db.commit()
    db.refresh(patient)
    return patient


@router_patients.patch("/{patient_id}", response_model=PatientOut)
def update_patient(patient_id: uuid.UUID, payload: PatientUpdate, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(patient, field, value)
    db.commit()
    db.refresh(patient)
    return patient


@router_patients.delete("/{patient_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_patient(patient_id: uuid.UUID, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    db.delete(patient)
    db.commit()


# ─────────────────────────────────────────────
# 6. Vitals
# ─────────────────────────────────────────────

router_vitals = APIRouter(prefix="/vitals", tags=["Vitals"])


@router_vitals.get("/{vitals_id}", response_model=VitalsOut)
def get_vitals(vitals_id: uuid.UUID, db: Session = Depends(get_db)):
    vitals = db.query(Vitals).filter(Vitals.id == vitals_id).first()
    if not vitals:
        raise HTTPException(status_code=404, detail="Vitals not found")
    return vitals


@router_vitals.post("/", response_model=VitalsOut, status_code=status.HTTP_201_CREATED)
def create_vitals(payload: VitalsCreate, db: Session = Depends(get_db)):
    vitals = Vitals(**payload.model_dump())
    db.add(vitals)
    db.commit()
    db.refresh(vitals)
    return vitals


@router_vitals.patch("/{vitals_id}", response_model=VitalsOut)
def update_vitals(vitals_id: uuid.UUID, payload: VitalsUpdate, db: Session = Depends(get_db)):
    vitals = db.query(Vitals).filter(Vitals.id == vitals_id).first()
    if not vitals:
        raise HTTPException(status_code=404, detail="Vitals not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(vitals, field, value)
    db.commit()
    db.refresh(vitals)
    return vitals


@router_vitals.delete("/{vitals_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vitals(vitals_id: uuid.UUID, db: Session = Depends(get_db)):
    vitals = db.query(Vitals).filter(Vitals.id == vitals_id).first()
    if not vitals:
        raise HTTPException(status_code=404, detail="Vitals not found")
    db.delete(vitals)
    db.commit()


# ─────────────────────────────────────────────
# 7. Prescriptions
# ─────────────────────────────────────────────

router_prescriptions = APIRouter(prefix="/prescriptions", tags=["Prescriptions"])


@router_prescriptions.get("/{prescription_id}", response_model=PrescriptionOut)
def get_prescription(prescription_id: uuid.UUID, db: Session = Depends(get_db)):
    prescription = db.query(Prescription).filter(Prescription.id == prescription_id).first()
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
    return prescription


@router_prescriptions.post("/", response_model=PrescriptionOut, status_code=status.HTTP_201_CREATED)
def create_prescription(payload: PrescriptionCreate, db: Session = Depends(get_db)):
    prescription = Prescription(**payload.model_dump())
    db.add(prescription)
    db.commit()
    db.refresh(prescription)
    return prescription


@router_prescriptions.patch("/{prescription_id}", response_model=PrescriptionOut)
def update_prescription(prescription_id: uuid.UUID, payload: PrescriptionUpdate, db: Session = Depends(get_db)):
    prescription = db.query(Prescription).filter(Prescription.id == prescription_id).first()
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(prescription, field, value)
    db.commit()
    db.refresh(prescription)
    return prescription


@router_prescriptions.delete("/{prescription_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_prescription(prescription_id: uuid.UUID, db: Session = Depends(get_db)):
    prescription = db.query(Prescription).filter(Prescription.id == prescription_id).first()
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")
    db.delete(prescription)
    db.commit()


# ─────────────────────────────────────────────
# 8. Appointments
# ─────────────────────────────────────────────

router_appointments = APIRouter(prefix="/appointments", tags=["Appointments"])


@router_appointments.get("/", response_model=list[AppointmentOut])
def list_appointments(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    patient_id: Optional[uuid.UUID] = Query(None),
    doctor_id: Optional[uuid.UUID] = Query(None),
    status: Optional[AppointmentStatusModel] = Query(None),
    db: Session = Depends(get_db),
):
    q = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor),
            joinedload(Appointment.vitals),
            joinedload(Appointment.prescription),
        )
    )
    if patient_id:
        q = q.filter(Appointment.patient_id == patient_id)
    if doctor_id:
        q = q.filter(Appointment.doctor_id == doctor_id)
    if status:
        q = q.filter(Appointment.status == status)
    return q.order_by(Appointment.appointment_time.desc()).offset(skip).limit(limit).all()


@router_appointments.get("/{appointment_id}", response_model=AppointmentOut)
def get_appointment(appointment_id: uuid.UUID, db: Session = Depends(get_db)):
    appointment = (
        db.query(Appointment)
        .options(
            joinedload(Appointment.patient),
            joinedload(Appointment.doctor),
            joinedload(Appointment.vitals),
            joinedload(Appointment.prescription),
        )
        .filter(Appointment.id == appointment_id)
        .first()
    )
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appointment


@router_appointments.post("/", response_model=AppointmentOut, status_code=status.HTTP_201_CREATED)
def create_appointment(payload: AppointmentCreate, db: Session = Depends(get_db)):
    if not db.query(Patient).filter(Patient.id == payload.patient_id).first():
        raise HTTPException(status_code=404, detail="Patient not found")
    if payload.doctor_id and not db.query(Doctor).filter(Doctor.id == payload.doctor_id).first():
        raise HTTPException(status_code=404, detail="Doctor not found")
    appointment = Appointment(**payload.model_dump())
    db.add(appointment)
    db.commit()
    db.refresh(appointment)
    return appointment


@router_appointments.patch("/{appointment_id}", response_model=AppointmentOut)
def update_appointment(appointment_id: uuid.UUID, payload: AppointmentUpdate, db: Session = Depends(get_db)):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(appointment, field, value)
    db.commit()
    db.refresh(appointment)
    return appointment


@router_appointments.patch("/{appointment_id}/status", response_model=AppointmentOut)
def update_appointment_status(
    appointment_id: uuid.UUID,
    new_status: AppointmentStatusModel = Query(...),
    db: Session = Depends(get_db),
):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    appointment.status = new_status
    db.commit()
    db.refresh(appointment)
    return appointment


@router_appointments.delete("/{appointment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_appointment(appointment_id: uuid.UUID, db: Session = Depends(get_db)):
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")
    db.delete(appointment)
    db.commit()


# ─────────────────────────────────────────────
# 9. Consultation Records
# ─────────────────────────────────────────────

router_consultations = APIRouter(prefix="/consultation-records", tags=["Consultation Records"])


@router_consultations.get("/", response_model=list[ConsultationRecordOut])
def list_consultations(
    appointment_id: Optional[uuid.UUID] = Query(None),
    doctor_id: Optional[uuid.UUID] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    q = db.query(ConsultationRecord)
    if appointment_id:
        q = q.filter(ConsultationRecord.appointment_id == appointment_id)
    if doctor_id:
        q = q.filter(ConsultationRecord.doctor_id == doctor_id)
    return q.order_by(ConsultationRecord.consultation_date.desc()).offset(skip).limit(limit).all()


@router_consultations.get("/{record_id}", response_model=ConsultationRecordOut)
def get_consultation(record_id: uuid.UUID, db: Session = Depends(get_db)):
    record = db.query(ConsultationRecord).filter(ConsultationRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Consultation record not found")
    return record


@router_consultations.post("/", response_model=ConsultationRecordOut, status_code=status.HTTP_201_CREATED)
def create_consultation(payload: ConsultationRecordCreate, db: Session = Depends(get_db)):
    if not db.query(Appointment).filter(Appointment.id == payload.appointment_id).first():
        raise HTTPException(status_code=404, detail="Appointment not found")
    record = ConsultationRecord(**payload.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router_consultations.patch("/{record_id}", response_model=ConsultationRecordOut)
def update_consultation(record_id: uuid.UUID, payload: ConsultationRecordUpdate, db: Session = Depends(get_db)):
    record = db.query(ConsultationRecord).filter(ConsultationRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Consultation record not found")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(record, field, value)
    db.commit()
    db.refresh(record)
    return record


@router_consultations.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_consultation(record_id: uuid.UUID, db: Session = Depends(get_db)):
    record = db.query(ConsultationRecord).filter(ConsultationRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Consultation record not found")
    db.delete(record)
    db.commit()


# ─────────────────────────────────────────────
# 10. Audit Logs
# ─────────────────────────────────────────────

router_audit = APIRouter(prefix="/audit-logs", tags=["Audit Logs"])


@router_audit.get("/", response_model=list[AuditLogOut])
def list_audit_logs(
    user_id: Optional[uuid.UUID] = Query(None),
    entity_type: Optional[str] = Query(None),
    entity_id: Optional[uuid.UUID] = Query(None),
    action: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
):
    q = db.query(AuditLog)
    if user_id:
        q = q.filter(AuditLog.user_id == user_id)
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if entity_id:
        q = q.filter(AuditLog.entity_id == entity_id)
    if action:
        q = q.filter(AuditLog.action.ilike(f"%{action}%"))
    return q.order_by(AuditLog.timestamp.desc()).offset(skip).limit(limit).all()


@router_audit.get("/{log_id}", response_model=AuditLogOut)
def get_audit_log(log_id: uuid.UUID, db: Session = Depends(get_db)):
    log = db.query(AuditLog).filter(AuditLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Audit log not found")
    return log


@router_audit.post("/", response_model=AuditLogOut, status_code=status.HTTP_201_CREATED)
def create_audit_log(payload: AuditLogCreate, db: Session = Depends(get_db)):
    log = AuditLog(**payload.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


# ─────────────────────────────────────────────
# Register all routers — paste into main.py
# ─────────────────────────────────────────────
#
# from app.routes import (
#     router_roles, router_users, router_doctors, router_schedules,
#     router_patients, router_vitals, router_prescriptions,
#     router_appointments, router_consultations, router_audit,
# )
#
# app.include_router(router_roles)
# app.include_router(router_users)
# app.include_router(router_doctors)
# app.include_router(router_schedules)
# app.include_router(router_patients)
# app.include_router(router_vitals)
# app.include_router(router_prescriptions)
# app.include_router(router_appointments)
# app.include_router(router_consultations)
# app.include_router(router_audit)