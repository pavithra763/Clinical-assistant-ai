
from sqlalchemy import (
    Column,
    String,
    Integer,
    Boolean,
    Text,
    ForeignKey,
    TIMESTAMP,
    Time
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from app.database import Base


# 1. Roles
class Role(Base):
    __tablename__ = "roles"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), unique=True, nullable=False)
    permissions = Column(JSONB, nullable=False)

    users = relationship("User", back_populates="role")


# 2. Users
class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    password_hash = Column(String(255))

    role_id = Column(UUID(as_uuid=True), ForeignKey("roles.id", ondelete="SET NULL"))

    created_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now()
    )

    role = relationship("Role", back_populates="users")
    audit_logs = relationship("AuditLog", back_populates="user")


# 3. Doctors
class Doctor(Base):
    __tablename__ = "doctors"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False)
    specialty = Column(String(100), nullable=False)
    is_available = Column(Boolean, default=True)
    phone = Column(String(20))

    created_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now()
    )

    schedules = relationship("DoctorSchedule", back_populates="doctor")
    appointments = relationship("Appointment", back_populates="doctor")


# 4. Doctor Schedules
class DoctorSchedule(Base):
    __tablename__ = "doctor_schedules"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    doctor_id = Column(
        UUID(as_uuid=True),
        ForeignKey("doctors.id", ondelete="CASCADE")
    )

    day_of_week = Column(String(15), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    max_patients = Column(Integer, default=10)
    room = Column(String(50))
    slot_type = Column(String(20), default="available")

    doctor = relationship("Doctor", back_populates="schedules")


# 5. Patients
class Patient(Base):
    __tablename__ = "patients"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    name = Column(String(100), nullable=False)
    age = Column(Integer)
    gender = Column(String(20))
    phone = Column(String(20))
    email = Column(String(150))
    address = Column(Text)
    external_ehr_id = Column(String(100))

    created_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now()
    )

    appointments = relationship("Appointment", back_populates="patient")


# 6. Vitals
class Vitals(Base):
    __tablename__ = "vitals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    bp = Column(String(20))
    pulse = Column(String(10))
    spo2 = Column(String(10))
    temp = Column(String(10))
    weight = Column(String(10))
    glucose = Column(String(20))

    captured_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now()
    )

    appointments = relationship("Appointment", back_populates="vitals")


# 7. Prescriptions
class Prescription(Base):
    __tablename__ = "prescriptions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    medication_prescription = Column(Text)
    injections = Column(Text)
    therapeutic_services = Column(Text)
    laboratory_services = Column(Text)
    diagnostic_imaging = Column(Text)
    cardio_pulmonary_diagnostics = Column(Text)
    minor_procedures = Column(Text)
    preventive_support_services = Column(Text)
    home_healthcare = Column(Text)
    admission_notes = Column(Text)

    created_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now()
    )

    appointments = relationship("Appointment", back_populates="prescription")


# 8. Appointments
class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    patient_id = Column(
        UUID(as_uuid=True),
        ForeignKey("patients.id", ondelete="CASCADE")
    )

    doctor_id = Column(
        UUID(as_uuid=True),
        ForeignKey("doctors.id", ondelete="SET NULL")
    )

    appointment_time = Column(
        TIMESTAMP(timezone=True),
        nullable=False
    )

    reason_for_visit = Column(Text)
    status = Column(String(30), default="booked")
    room = Column(String(50))
    source = Column(String(30))

    vitals_id = Column(
        UUID(as_uuid=True),
        ForeignKey("vitals.id", ondelete="SET NULL")
    )

    prescription_id = Column(
        UUID(as_uuid=True),
        ForeignKey("prescriptions.id", ondelete="SET NULL")
    )

    summary = Column(Text)
    english_transcript = Column(Text)
    preliminary_notes = Column(Text)
    medical_history = Column(Text)
    triage_report = Column(Text)
    notes = Column(Text)

    dispatch_status = Column(JSONB)

    created_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now()
    )

    updated_at = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now(),
        onupdate=func.now()
    )

    patient = relationship("Patient", back_populates="appointments")
    doctor = relationship("Doctor", back_populates="appointments")
    vitals = relationship("Vitals", back_populates="appointments")
    prescription = relationship("Prescription", back_populates="appointments")
    consultation_records = relationship(
        "ConsultationRecord",
        back_populates="appointment"
    )


# 9. Consultation Records
class ConsultationRecord(Base):
    __tablename__ = "consultation_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    appointment_id = Column(
        UUID(as_uuid=True),
        ForeignKey("appointments.id", ondelete="CASCADE")
    )

    consultation_date = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now()
    )

    patient_name = Column(String(100))

    doctor_id = Column(
        UUID(as_uuid=True),
        ForeignKey("doctors.id")
    )

    turns = Column(JSONB, nullable=False)

    english_transcript = Column(Text)
    summary = Column(Text)

    prescription_id = Column(
        UUID(as_uuid=True),
        ForeignKey("prescriptions.id")
    )

    detected_languages = Column(Text)

    appointment = relationship(
        "Appointment",
        back_populates="consultation_records"
    )


# 10. Audit Logs
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    timestamp = Column(
        TIMESTAMP(timezone=True),
        server_default=func.now()
    )

    user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL")
    )

    user_name = Column(String(100))
    action = Column(String(100), nullable=False)
    details = Column(Text)
    entity_id = Column(UUID(as_uuid=True))
    entity_type = Column(String(30))

    user = relationship("User", back_populates="audit_logs")

