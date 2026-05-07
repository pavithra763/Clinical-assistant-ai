# Feature Documentation: Clinical Conversation Assistant

This document outlines the comprehensive feature set of the Clinical Conversation Assistant, from high-level clinical workflows to advanced AI-driven analysis and administrative tools.

---

## 1. Clinical Workflow & Patient Journey
The application facilitates the entire patient journey through distinct, role-based modules.

*   **Integrated Patient Booking**: 
    *   A dedicated booking interface to manage patient registrations.
    *   Dropdown selection for specific Doctors and Specialties.
    *   Real-time validation of appointment time slots.
*   **Nurse Intake & Triage**:
    *   Handled via the `PreConsultationScreen`.
    *   Allows nurses to record vital signs and preliminary symptoms.
    *   Generates a **Triage Summary** for the doctor to review before entering the consultation.
*   **Doctor’s Consultation Hub**:
    *   The primary interface for clinical encounters.
    *   Access to the AI Scribe tool to record investigations and discussions.
*   **Post-Consultation Dispatch**:
    *   A final step to review digital prescriptions, lab orders, and referrals.
    *   Ability to push finalized data to external EHR systems and pharmacies.

---

## 2. Core AI Scribe & Transcription Engine
The central technological pillar focused on capturing clinical conversations with high fidelity.

*   **Multilingual Live Transcription**:
    *   The AI is instructed to listen to conversations in multiple languages (English, Spanish, Hindi, etc.).
    *   It performs real-time translation, rendering the entire dialogue into professional medical English for the transcript.
*   **Automatic Speaker Diarization**:
    *   Distinguishes between "Speaker A" (Doctor) and "Speaker B" (Patient/Relative).
    *   Provides a clear, turn-by-turn scrolling log during the live session.
*   **Pause & Seamless Resume**:
    *   Clinicians can pause to discuss sensitive or non-clinical matters.
    *   Recording resumes without losing context or splitting files.
*   **Medical Terminology Optimization**:
    *   System instructions are optimized for clinical accuracy (e.g., distinguishing "aural" from "oral").
    *   Prioritizes common medications and pathologies (Lisinopril, Hyperlipidemia, etc.).

---

## 3. AI-Powered Analysis & Documentation
Transforms raw conversational data into structured, actionable medical records.

*   **Automated SOAP Summarization**:
    *   Generates comprehensive summaries in the clinical standard **SOAP (Subjective, Objective, Assessment, Plan)** format.
    *   Includes HPI (History of Present Illness), PMH (Past Medical History), and Plan details.
*   **Intelligent Order Extraction**:
    *   Scans transcripts to pull out **Medications**, **Lab Tests**, **Imaging**, and **Referrals**.
    *   Structures data into JSON format with dosages, frequencies (QD, BID, TID), and routes.
*   **Medical Transcript Polishing**:
    *   Post-recording refinement that corrects grammar, removes verbal fillers (um, ah), and formats text into a professional medical script.
*   **Vital Signs Normalization**:
    *   Extracts weights, blood pressure, and pulse from speech and formats them into standard notation (e.g., "120/80 mmHg").

---

## 4. Interaction & Dispatch Tools
Enables clinicians to verify and act on AI-generated insights.

*   **Interactive Prescription Correction**:
    *   **Dual-Mode Input**: Users can correct prescriptions by either typing or using a short "voice-correction" clip.
    *   **Context-Aware Editing**: The AI merges the correction with the original transcript to generate a refined, accurate order.
*   **One-Click WhatsApp Sharing**:
    *   Pre-configured buttons to "Share with Pharmacy" or "Share with Nursing".
    *   Automatically formats summaries and prescriptions into readable messages for mobile sharing.
*   **EHR (Electronic Health Record) Integration**:
    *   Integration points for FHIR-compliant systems.
    *   "Push to EHR" functionality with audit logging for compliance.

---

## 5. Administration & Customization
Tools for clinic managers and power users to tailor the application.

*   **Role-Based Access Control (RBAC)**:
    *   Detailed permission management (e.g., `viewDashboard`, `performIntake`, `configureClinic`).
    *   Ability to create custom roles (Admin, Nurse, Senior Doctor, Receptionist).
*   **Advanced Prompt Customization**:
    *   An interface to view and edit the underlying system prompts for Transcription, Summarization, and Extraction.
    *   Allows clinics to enforce specific documentation styles or branding.
*   **Clinic & Doctor Profiles**:
    *   Manage a roster of doctors, their specialties, and shift timings.
    *   Configurable clinic headers for professional PDF generation.
*   **User Simulation & Switching**:
    *   A rapid user-switcher modal to facilitate testing across different roles (receptionist vs. doctor).

---

## 6. Platforms, UI & Resilience
Ensuring the application is accessible, robust, and performs across all environments.

*   **Appearance Modes**:
    *   **Light & Dark Mode** support with automatic system preference detection.
*   **State Persistence**:
    *   Full application state (appointments, settings, transcripts) is persisted to `localStorage`.
    *   Prevents data loss during browser refreshes or accidental tab closures.
*   **Multi-Format Exporting**:
    *   Export results as **Professional PDF** (with letterhead), **Markdown (.md)**, or **Plain Text (.txt)**.
*   **Robust Error Handling & Resilience**:
    *   **Automatic Retries**: Exponential backoff for AI service failures.
    *   **Sensitive Permission Management**: Elegant UI banners for microphone access or API key issues.
*   **Responsive Dashboard**:
    *   A fluid layout optimized for tablets (for rounds) and desktop workstations.
