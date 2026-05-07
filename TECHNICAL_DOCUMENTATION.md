# Technical Documentation: Clinical Conversation Assistant

## 1. Executive Summary
The Clinical Conversation Assistant is a production-grade, AI-powered healthcare management platform designed to streamline the clinical workflow from patient booking to post-consultation dispatch. It leverages state-of-the-art Large Language Models (LLMs) to provide real-time transcription, medical translation, and structured clinical documentation extraction (SOAP notes).

---

## 2. System Architecture
### 2.1 Overview
The application is built as a **Client-Side Single Page Application (SPA)** using **React** and **TypeScript**. It follows a modular architecture where the business logic is decoupled from the UI components.

### 2.2 Core Logic Flow
1.  **Patient Booking**: Receptionist books appointments for specific doctors.
2.  **Nurse Intake**: Nurses record vitals and preliminary symptoms.
3.  **Consultation**: Doctors use the AI Scribe to record the encounter.
4.  **AI Processing**: Real-time diarization, medical term correction, and final summarization.
5.  **Dispatch & EHR**: Finalizing orders and pushing data to external Electronic Health Records (EHR).

---

## 3. Technology Stack
-   **Frontend Framework**: React 18+ with Vite (Build Tool).
-   **Language**: TypeScript (Strict Type Safety).
-   **Styling**: Tailwind CSS (Utility-first styling).
-   **Animations**: Motion (framer-motion) for smooth transitions.
-   **Icons**: Lucide React.
-   **State Management**: React Hooks (useState, useEffect, useMemo) with LocalStorage persistence.
-   **AI SDK**: @google/genai (Google Gemini SDK).

---

## 4. AI Architecture
### 4.1 AI Scribe Engine
The application uses the **Google Gemini API** (Gemini 1.5 Flash) for multimodal medical transcription.

-   **Live Transcription**: Uses system instructions to prioritize medical vocabulary (e.g., Lisinopril, Hypertension).
-   **Transcription Polishing**: Applies deep clinical logic to correct phonetic ASR errors and translate non-English dialogue into professional medical English.
-   **SOAP Summarization**: Generates structured Subjective, Objective, Assessment, and Plan notes.
-   **Prescription Extraction**: Parses the transcript into a strict JSON schema for medication, lab tests, and imaging.

### 4.2 Prompt Engineering
Prompts are defined in `src/prompts/defaultPrompts.ts` using highly structured templates:
-   **Core Directives**: Enforce speaker identification and DIARIZATION.
-   **Linguistic Professionalism**: Removes fillers (um, ah) while preserving clinical intent.
-   **Standardization**: Standardizes dosages (mg, mcg) and frequencies (QD, BID).

---

## 5. Module Explanations
### 5.1 `App.tsx` (The Orchestrator)
The central hub managing application state, including appointments, user authentication, and global configuration. It handles the transition between different "consultation states" (dashboard, intake, consultation, etc.).

### 5.2 `services/`
-   **`aiService.ts`**: Abstract interface for AI operations.
-   **`geminiService.ts`**: Implementation of the Google Gemini integration.
-   **`ehrService.ts`**: Handles data transmission to external FHIR-compliant EHR systems.
-   **`apiClient.ts`**: Centralized HTTP client with retry logic and error handling.

### 5.3 `components/`
-   **`AppointmentsDashboard`**: High-level view of clinical operations.
-   **`ClinicConfigScreen`**: Management of doctor lists, specialties, and schedules.
-   **`RBACScreen`**: Role-Based Access Control configuration.
-   **`ResultsDisplay`**: Specialized UI for reviewing AI-generated clinical summaries and orders.

---

## 6. Database & Data Models
The application uses a **Relational Schema** implemented in TypeScript and persisted via `localStorage`.

### 6.1 Key Entities
-   **Appointment**:
    ```typescript
    {
      id: string;
      patientName: string;
      status: 'booked' | 'intake' | 'in-consultation' | 'completed' ...;
      doctorId: string;
      vitals: Vitals;
      summary?: string;
      prescriptionDetails?: PrescriptionDetails;
    }
    ```
-   **Doctor**: Includes specialty and weekly recurring schedules.
-   **Roll & User**: Defines permissions (e.g., `viewDashboard`, `performIntake`, `startConsultation`).

---

## 7. Security & Compliance
-   **Role-Based Access Control (RBAC)**: Strict permission checks before rendering clinical screens or allowing actions.
-   **Audit Logging**: Every sensitive action (login, state change, EHR push) is logged with a timestamp and user ID.
-   **PII Handling**: Data is kept client-side by default. External integrations (EHR) use secure API keys managed via environment variables.

---

## 9. Database Design & Table Structure
The application's data layer is modeled for a relational database (PostgreSQL/MySQL). While the current implementation uses `localStorage` for rapid prototyping, the following schema represents the production-ready data model.

### 9.1 Data Persistence Architecture
- **Primary Persistence**: SQL Database (e.g., PostgreSQL).
- **Blob Storage**: S3 or Google Cloud Storage (for raw audio files, though currently not stored).
- **Caching**: Redis (for real-time transcription sessions).

### 9.2 Table Definitions (Summary)

| Table Name | Description | Key Relationships |
| :--- | :--- | :--- |
| `roles` | Defines RBAC roles and permissions. | Parent to `users`. |
| `users` | System users (Doctors, Nurses, Admins). | References `roles`. |
| `doctors` | Clinical providers and their specialties. | Parent to `doctor_schedules`, `appointments`. |
| `patients` | Patient demographics and contact info. | Parent to `appointments`. |
| `appointments` | The core entity linking patients, doctors, and results. | References `patients`, `doctors`, `vitals`, `prescriptions`. |
| `vitals` | Clinical measurements (BP, Pulse, etc.). | Child of `appointments`. |
| `prescriptions`| AI-extracted medical orders and instructions. | Child of `appointments`. |
| `consultation_records`| Full historical log of a specific encounter. | References `appointments`. |
| `audit_logs` | Security logs for regulatory compliance. | References `users`. |

### 9.3 SQL Schema
A complete implementation script is available in the root directory: `DATABASE_SCHEMA.sql`.

#### Key Constraints:
- **UUIDs**: Used for all primary keys to ensure global uniqueness.
- **JSONB**: Used for unstructured or array-heavy data like `permissions` and `turns` (transcript segments).
- **Time Zones**: All timestamps are stored with time zone information (`TIMESTAMP WITH TIME ZONE`).
