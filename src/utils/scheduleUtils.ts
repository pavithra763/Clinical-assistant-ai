import type { Appointment, DoctorSchedule, Doctor } from '../types';
import type { AppointmentRequest } from '../services/aiService';

/**
 * Finds the next available 15-minute appointment slot in a multi-doctor clinic.
 * It tries to match a requested doctor first, then falls back to any available doctor.
 * 
 * @param request - The parsed appointment request from the AI.
 * @param schedules - An object containing schedules for all doctors, keyed by doctor ID.
 * @param appointments - The list of all currently booked appointments.
 * @param doctors - A list of all doctor profiles.
 * @returns An object with the appointment date, doctor ID, and room, or null if no slot is found.
 */
export const findAvailableSlot = (
    request: AppointmentRequest,
    schedules: { [doctorId: string]: DoctorSchedule },
    appointments: Appointment[],
    doctors: Doctor[]
): { date: Date; doctorId: string; room: string } | null => {

    let targetDate: Date;
    try {
        // Handle YYYY-MM-DD format from forms to avoid timezone issues.
        // new Date('2024-08-25') creates a date at UTC midnight, which can be the previous day in some timezones.
        // This manual parsing creates the date at local midnight.
        if (/^\d{4}-\d{2}-\d{2}$/.test(request.requestedDate)) {
            const [year, month, day] = request.requestedDate.split('-').map(Number);
            targetDate = new Date(year, month - 1, day);
        } else {
             // Fallback for NLP dates like "today", "tomorrow"
            const lowerDateStr = request.requestedDate.toLowerCase().trim();
            const now = new Date();
            now.setHours(0, 0, 0, 0); // start of today

            if (lowerDateStr === 'today') {
                targetDate = now;
            } else if (lowerDateStr.includes('tomorrow')) { // Prioritize 'tomorrow' even if other date info is present
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                targetDate = tomorrow;
            } else {
                // For other NLP dates, attempt to parse but this can be unreliable across timezones
                const tempDate = new Date(request.requestedDate);
                if (isNaN(tempDate.getTime())) return null;
                targetDate = tempDate;
                targetDate.setHours(0, 0, 0, 0);
            }
        }
    } catch (e) {
        return null;
    }
    
    targetDate.setHours(0, 0, 0, 0);

    // Determine which doctors to check, filtering for available ones first.
    let doctorsToCheck = doctors.filter(d => d.isAvailable);
    if (request.requestedDoctor) {
        const lowerReqDoctor = request.requestedDoctor.toLowerCase();
        const foundDoctors = doctorsToCheck.filter(d => 
            d.name.toLowerCase().includes(lowerReqDoctor) || 
            d.specialty.toLowerCase().includes(lowerReqDoctor)
        );
        if (foundDoctors.length > 0) {
            doctorsToCheck = foundDoctors;
        }
    }

    const dayOfWeek = targetDate.toLocaleDateString('en-US', { weekday: 'long' });

    // Iterate through the prioritized list of doctors
    for (const doctor of doctorsToCheck) {
        const doctorSchedule = schedules[doctor.id];
        if (!doctorSchedule || !doctorSchedule[dayOfWeek]) continue; // Doctor doesn't work this day

        const doctorAppointments = appointments.filter(a => a.doctorId === doctor.id);

        for (const slot of doctorSchedule[dayOfWeek]) {
            const appointmentsInSlot = doctorAppointments.filter(a => {
                const appointmentDate = new Date(a.appointmentTime);
                appointmentDate.setHours(0, 0, 0, 0);
                if (appointmentDate.getTime() !== targetDate.getTime()) return false;
                const appointmentTime = new Date(a.appointmentTime).toTimeString().slice(0, 5);
                return appointmentTime >= slot.startTime && appointmentTime < slot.endTime;
            }).length;

            if (appointmentsInSlot < slot.maxPatients) {
                const [startHour, startMinute] = slot.startTime.split(':').map(Number);
                const slotStartDate = new Date(targetDate);
                slotStartDate.setHours(startHour, startMinute);
                
                const nextAvailableTime = new Date(slotStartDate.getTime() + appointmentsInSlot * 15 * 60000); // 15 mins per patient

                if (nextAvailableTime.toTimeString().slice(0, 5) < slot.endTime) {
                    const hour = nextAvailableTime.getHours();
                    const lowerTimeStr = request.requestedTime.toLowerCase();
                    
                    const isMorning = hour >= 8 && hour < 12;
                    const isAfternoon = hour >= 12 && hour < 17;
                    const isEvening = hour >= 17 && hour < 21;

                    const timeMatch = (
                        !lowerTimeStr ||
                        (lowerTimeStr.includes('morning') && isMorning) ||
                        (lowerTimeStr.includes('afternoon') && isAfternoon) ||
                        (lowerTimeStr.includes('evening') && isEvening) ||
                        (!lowerTimeStr.includes('morning') && !lowerTimeStr.includes('afternoon') && !lowerTimeStr.includes('evening'))
                    );
                    
                    if (timeMatch) {
                        return { date: nextAvailableTime, doctorId: doctor.id, room: slot.room };
                    }
                }
            }
        }
    }

    return null; // No available slots found
};

/**
 * Checks if a proposed appointment time conflicts with existing appointments or doctor schedules.
 * @param doctorId - The ID of the doctor.
 * @param proposedTime - The Date object of the proposed appointment.
 * @param durationMinutes - Duration of the appointment (default 15).
 * @param appointments - Existing appointments.
 * @param schedules - Doctor schedules.
 * @returns An error message if a conflict is found, otherwise null.
 */
export const checkAppointmentConflict = (
    doctorId: string,
    proposedTime: Date,
    durationMinutes: number = 15,
    appointments: Appointment[],
    schedules: { [doctorId: string]: DoctorSchedule }
): string | null => {
    const dayOfWeek = proposedTime.toLocaleDateString('en-US', { weekday: 'long' });
    const doctorSchedule = schedules[doctorId];
    
    if (!doctorSchedule || !doctorSchedule[dayOfWeek]) {
        return "The selected doctor does not work on this day.";
    }

    const proposedTimeStr = proposedTime.toTimeString().slice(0, 5);
    const proposedEndTime = new Date(proposedTime.getTime() + durationMinutes * 60000);
    const proposedEndTimeStr = proposedEndTime.toTimeString().slice(0, 5);

    // 1. Check if the time is within doctor's working slots
    const workingSlots = doctorSchedule[dayOfWeek].filter(s => s.type !== 'unavailable');
    const isInAnySlot = workingSlots.some(slot => 
        proposedTimeStr >= slot.startTime && proposedEndTimeStr <= slot.endTime
    );

    if (!isInAnySlot) {
        return "The requested time is outside the doctor's working hours or in an unavailable slot.";
    }

    // 2. Check for overlapping appointments
    const overlappingAppt = appointments.find(a => {
        if (a.doctorId !== doctorId || a.status === 'cancelled') return false;
        
        const existStart = new Date(a.appointmentTime);
        const existEnd = new Date(existStart.getTime() + 15 * 60000); // Assume 15 min duration
        
        return (proposedTime < existEnd && proposedEndTime > existStart);
    });

    if (overlappingAppt) {
        return `Conflict: This doctor already has an appointment with ${overlappingAppt.patientName} at this time.`;
    }

    return null;
};

/**
 * Generates a formatted string for a WhatsApp appointment confirmation message.
 * @param appointment - The appointment object containing all details.
 * @param doctorName - The name of the doctor for the appointment.
 * @returns A formatted string ready to be sent.
 */
export const generateAppointmentConfirmationMessage = (appointment: Appointment, doctorName: string): string => {
    const { patientName, appointmentTime, reasonForVisit, patientInfo, room } = appointment;

    const date = new Date(appointmentTime);
    const friendlyDate = date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const friendlyTime = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });

    let message = `*Appointment Confirmation*\n\n`;
    message += `Hello ${patientName},\n\n`;
    message += `This is a confirmation for your appointment.\n\n`;
    if (doctorName) {
        message += `*Doctor:* ${doctorName}\n`;
    }
    message += `*Date:* ${friendlyDate}\n`;
    message += `*Time:* ${friendlyTime}\n`;
    message += `*Location:* ${room}\n`;

    if (reasonForVisit && reasonForVisit !== 'Not specified') {
        message += `*Reason:* ${reasonForVisit}\n`;
    }

    message += `\n*Patient Details Received:*\n`;
    message += `- Name: ${patientInfo?.name || patientName}\n`;
    if (patientInfo?.age) message += `- Age: ${patientInfo.age}\n`;
    if (patientInfo?.gender) message += `- Gender: ${patientInfo.gender}\n`;
    
    message += `\nWe look forward to seeing you.`;

    return message;
};

/**
 * Generates a formatted string for a WhatsApp appointment reminder for a patient.
 * @param appointment - The appointment object.
 * @param doctorName - The name of the doctor for the appointment.
 * @param clinicName - The name of the clinic.
 * @returns A formatted string ready to be sent.
 */
export const generatePatientReminderMessage = (appointment: Appointment, doctorName: string, clinicName: string): string => {
    const date = new Date(appointment.appointmentTime);
    const friendlyTime = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });

    let message = `*Appointment Reminder from ${clinicName}*\n\n`;
    message += `Hello ${appointment.patientName},\n\n`;
    message += `This is a reminder for your upcoming appointment with *${doctorName}* today at *${friendlyTime}*.\n\n`;
    message += `Please arrive a few minutes early.`;

    return message;
};

/**
 * Generates a formatted string for a WhatsApp appointment reminder for a doctor.
 * @param appointment - The appointment object.
 * @param doctorName - The name of the doctor for the appointment.
 * @returns A formatted string ready to be sent.
 */
export const generateDoctorReminderMessage = (appointment: Appointment, doctorName: string): string => {
    const date = new Date(appointment.appointmentTime);
    const friendlyTime = date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true });

    let message = `*Appointment Reminder*\n\n`;
    message += `Hello ${doctorName},\n\n`;
    message += `This is a reminder for your upcoming appointment with *${appointment.patientName}* at *${friendlyTime}* in *${appointment.room}*.\n\n`;
    message += `*Reason for Visit:* ${appointment.reasonForVisit || 'Not specified'}`;

    return message;
};


/**
 * Opens a new browser tab with a pre-filled WhatsApp message.
 * @param phoneNumber - The recipient's phone number (with country code).
 * @param message - The message text to be sent.
 * @param onError - A callback function to handle cases where the phone number is missing.
 */
export const sendWhatsAppMessage = (phoneNumber: string, message: string, onError: (msg: string) => void) => {
    if (!phoneNumber || !phoneNumber.trim()) {
        onError(`Cannot send message: phone number is missing.`);
        return;
    }
    const url = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message.trim())}`;
    window.open(url, '_blank', 'noopener,noreferrer');
};