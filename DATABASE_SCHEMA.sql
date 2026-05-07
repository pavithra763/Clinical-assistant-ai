-- Clinical Conversation Assistant Database Schema
-- Version: 1.0.0
-- Description: Standard SQL for PostgreSQL or equivalent relational database

-- 1. Roles & Permissions
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) UNIQUE NOT NULL, -- Admin, Doctor, Nurse, Receptionist, Staff
    permissions JSONB NOT NULL -- Stores an array of permission strings
);

-- 2. Users
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Doctors
CREATE TABLE doctors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    phone VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Doctor Schedules
CREATE TABLE doctor_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    day_of_week VARCHAR(15) NOT NULL, -- Monday, Tuesday, etc.
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    max_patients INTEGER DEFAULT 10,
    room VARCHAR(50),
    slot_type VARCHAR(20) DEFAULT 'available' -- available, unavailable
);

-- 5. Patients
CREATE TABLE patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    age INTEGER,
    gender VARCHAR(20),
    phone VARCHAR(20),
    email VARCHAR(150),
    address TEXT,
    external_ehr_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Vitals
CREATE TABLE vitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bp VARCHAR(20),
    pulse VARCHAR(10),
    spo2 VARCHAR(10),
    temp VARCHAR(10),
    weight VARCHAR(10),
    glucose VARCHAR(20),
    captured_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Prescriptions & Orders (Extraction Schema)
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medication_prescription TEXT,
    injections TEXT,
    therapeutic_services TEXT,
    laboratory_services TEXT,
    diagnostic_imaging TEXT,
    cardio_pulmonary_diagnostics TEXT,
    minor_procedures TEXT,
    preventive_support_services TEXT,
    home_healthcare TEXT,
    admission_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Appointments
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
    appointment_time TIMESTAMP WITH TIME ZONE NOT NULL,
    reason_for_visit TEXT,
    status VARCHAR(30) DEFAULT 'booked', -- booked, intake, in-consultation, completed, etc.
    room VARCHAR(50),
    source VARCHAR(30), -- whatsapp, patient-portal
    vitals_id UUID REFERENCES vitals(id) ON DELETE SET NULL,
    prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
    summary TEXT,
    english_transcript TEXT,
    preliminary_notes TEXT,
    medical_history TEXT,
    triage_report TEXT,
    notes TEXT,
    dispatch_status JSONB, -- Map of { 'pharmacy': true, 'ehr': false }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Consultation Records (Event History)
CREATE TABLE consultation_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    consultation_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    patient_name VARCHAR(100),
    doctor_id UUID REFERENCES doctors(id),
    turns JSONB NOT NULL, -- Array of { speaker, text, timestamp }
    english_transcript TEXT,
    summary TEXT,
    prescription_id UUID REFERENCES prescriptions(id),
    detected_languages TEXT
);

-- 10. Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_name VARCHAR(100),
    action VARCHAR(100) NOT NULL,
    details TEXT,
    entity_id UUID,
    entity_type VARCHAR(30) -- appointment, user, config, system
);

-- Indexes for performance
CREATE INDEX idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_doctor_schedules_doctor ON doctor_schedules(doctor_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
