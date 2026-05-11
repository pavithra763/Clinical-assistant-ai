import uuid
import enum
from datetime import datetime, time
from typing import Any, Optional
from pydantic import BaseModel, EmailStr, Field


# ─────────────────────────────────────────────
# Enums
# ─────────────────────────────────────────────

class AppointmentStatus(str, enum.Enum):
    scheduled = "scheduled"
    confirmed = "confirmed"
    in_progress = "in_progress"
    completed = "completed"
    cancelled = "cancelled"
    no_show = "no_show"


# ─────────────────────────────────────────────
# 1. Role
# ─────────────────────────────────────────────

class RoleBase(BaseModel):
    name: str = Field(..., max_length=50)
    permissions: dict[str, Any]


class RoleCreate(RoleBase):
    pass


class RoleUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=50)
    permissions: Optional[dict[str, Any]] = None


class RoleOut(RoleBase):
    id: uuid.UUID

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────
# 2. User
# ─────────────────────────────────────────────

class UserBase(BaseModel):
    name: str = Field(..., max_length=100)
    email: EmailStr


class UserCreate(UserBase):
    password: str
    role_id: Optional[uuid.UUID] = None


class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    email: Optional[EmailStr] = None
    role_id: Optional[uuid.UUID] = None


class UserOut(UserBase):
    id: uuid.UUID
    role_id: Optional[uuid.UUID] = None
    created_at: datetime
    role: Optional[RoleOut] = None

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────
# 3. Doctor
# ─────────────────────────────────────────────

class DoctorBase(BaseModel):
    name: str = Field(..., max_length=100)
    specialty: str = Field(..., max_length=100)
    is_available: Optional[bool] = True
    phone: Optional[str] = Field(None, max_length=20)


class DoctorCreate(DoctorBase):
    pass


class DoctorUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    specialty: Optional[str] = Field(None, max_length=100)
    is_available: Optional[bool] = None
    phone: Optional[str] = Field(None, max_length=20)


class DoctorOut(DoctorBase):
    id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────
# 4. Doctor Schedule
# ─────────────────────────────────────────────

class DoctorScheduleBase(BaseModel):
    day_of_week: str = Field(..., max_length=15)
    start_time: time
    end_time: time
    max_patients: int = 10
    room: Optional[str] = Field(None, max_length=50)
    slot_type: str = Field("available", max_length=20)


class DoctorScheduleCreate(DoctorScheduleBase):
    doctor_id: uuid.UUID


class DoctorScheduleUpdate(BaseModel):
    day_of_week: Optional[str] = Field(None, max_length=15)
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    max_patients: Optional[int] = None
    room: Optional[str] = Field(None, max_length=50)
    slot_type: Optional[str] = Field(None, max_length=20)


class DoctorScheduleOut(DoctorScheduleBase):
    id: uuid.UUID
    doctor_id: Optional[uuid.UUID] = None

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────
# 5. Patient
# ─────────────────────────────────────────────

class PatientBase(BaseModel):
    name: str = Field(..., max_length=100)
    age: Optional[int] = None
    gender: Optional[str] = Field(None, max_length=20)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    external_ehr_id: Optional[str] = Field(None, max_length=100)


class PatientCreate(PatientBase):
    pass


class PatientUpdate(BaseModel):
    name: Optional[str] = Field(None, max_length=100)
    age: Optional[int] = None
    gender: Optional[str] = Field(None, max_length=20)
    phone: Optional[str] = Field(None, max_length=20)
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    external_ehr_id: Optional[str] = Field(None, max_length=100)


class PatientOut(PatientBase):
    id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────
# 6. Vitals
# ─────────────────────────────────────────────

class VitalsBase(BaseModel):
    bp: Optional[str] = Field(None, max_length=20)
    pulse: Optional[str] = Field(None, max_length=10)
    spo2: Optional[str] = Field(None, max_length=10)
    temp: Optional[str] = Field(None, max_length=10)
    weight: Optional[str] = Field(None, max_length=10)
    glucose: Optional[str] = Field(None, max_length=20)


class VitalsCreate(VitalsBase):
    pass


class VitalsUpdate(VitalsBase):
    pass


class VitalsOut(VitalsBase):
    id: uuid.UUID
    captured_at: datetime

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────
# 7. Prescription
# ─────────────────────────────────────────────

class PrescriptionBase(BaseModel):
    medication_prescription: Optional[str] = None
    injections: Optional[str] = None
    therapeutic_services: Optional[str] = None
    laboratory_services: Optional[str] = None
    diagnostic_imaging: Optional[str] = None
    cardio_pulmonary_diagnostics: Optional[str] = None
    minor_procedures: Optional[str] = None
    preventive_support_services: Optional[str] = None
    home_healthcare: Optional[str] = None
    admission_notes: Optional[str] = None


class PrescriptionCreate(PrescriptionBase):
    pass


class PrescriptionUpdate(PrescriptionBase):
    pass


class PrescriptionOut(PrescriptionBase):
    id: uuid.UUID
    created_at: datetime

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────
# 8. Appointment
# ─────────────────────────────────────────────

class AppointmentBase(BaseModel):
    appointment_time: datetime
    reason_for_visit: Optional[str] = None
    status: AppointmentStatus = AppointmentStatus.scheduled
    room: Optional[str] = Field(None, max_length=50)
    source: Optional[str] = Field(None, max_length=30)
    summary: Optional[str] = None
    english_transcript: Optional[str] = None
    preliminary_notes: Optional[str] = None
    medical_history: Optional[str] = None
    triage_report: Optional[str] = None
    notes: Optional[str] = None
    dispatch_status: Optional[dict[str, Any]] = None


class AppointmentCreate(AppointmentBase):
    patient_id: uuid.UUID
    doctor_id: Optional[uuid.UUID] = None
    vitals_id: Optional[uuid.UUID] = None
    prescription_id: Optional[uuid.UUID] = None


class AppointmentUpdate(BaseModel):
    appointment_time: Optional[datetime] = None
    reason_for_visit: Optional[str] = None
    status: Optional[AppointmentStatus] = None
    room: Optional[str] = Field(None, max_length=50)
    source: Optional[str] = Field(None, max_length=30)
    doctor_id: Optional[uuid.UUID] = None
    vitals_id: Optional[uuid.UUID] = None
    prescription_id: Optional[uuid.UUID] = None
    summary: Optional[str] = None
    english_transcript: Optional[str] = None
    preliminary_notes: Optional[str] = None
    medical_history: Optional[str] = None
    triage_report: Optional[str] = None
    notes: Optional[str] = None
    dispatch_status: Optional[dict[str, Any]] = None


class AppointmentOut(AppointmentBase):
    id: uuid.UUID
    patient_id: Optional[uuid.UUID] = None
    doctor_id: Optional[uuid.UUID] = None
    vitals_id: Optional[uuid.UUID] = None
    prescription_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

    # Nested relations (optional, use when eager-loading)
    patient: Optional[PatientOut] = None
    doctor: Optional[DoctorOut] = None
    vitals: Optional[VitalsOut] = None
    prescription: Optional[PrescriptionOut] = None

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────
# 9. Consultation Record
# ─────────────────────────────────────────────

class ConsultationRecordBase(BaseModel):
    patient_name: Optional[str] = Field(None, max_length=100)
    turns: list[dict[str, Any]]
    english_transcript: Optional[str] = None
    summary: Optional[str] = None
    detected_languages: Optional[str] = None


class ConsultationRecordCreate(ConsultationRecordBase):
    appointment_id: uuid.UUID
    doctor_id: Optional[uuid.UUID] = None
    prescription_id: Optional[uuid.UUID] = None


class ConsultationRecordUpdate(BaseModel):
    patient_name: Optional[str] = Field(None, max_length=100)
    turns: Optional[list[dict[str, Any]]] = None
    english_transcript: Optional[str] = None
    summary: Optional[str] = None
    detected_languages: Optional[str] = None
    prescription_id: Optional[uuid.UUID] = None


class ConsultationRecordOut(ConsultationRecordBase):
    id: uuid.UUID
    appointment_id: Optional[uuid.UUID] = None
    doctor_id: Optional[uuid.UUID] = None
    prescription_id: Optional[uuid.UUID] = None
    consultation_date: datetime

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────
# 10. Audit Log
# ─────────────────────────────────────────────

class AuditLogBase(BaseModel):
    action: str = Field(..., max_length=100)
    details: Optional[str] = None
    entity_id: Optional[uuid.UUID] = None
    entity_type: Optional[str] = Field(None, max_length=30)
    user_name: Optional[str] = Field(None, max_length=100)


class AuditLogCreate(AuditLogBase):
    user_id: Optional[uuid.UUID] = None


class AuditLogOut(AuditLogBase):
    id: uuid.UUID
    user_id: Optional[uuid.UUID] = None
    timestamp: datetime

    model_config = {"from_attributes": True}