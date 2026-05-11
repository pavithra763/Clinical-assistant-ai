
import React, { useState, useEffect, useMemo } from 'react';
import type { Doctor, DoctorSchedule, TimeSlot } from '../types';
import { AlertIcon, CopyIcon, LockIcon, PlusIcon, RightArrowIcon, TrashIcon } from '../constants/icons';
import { ErrorFeedback } from './ErrorFeedback';

interface ClinicConfigScreenProps {
    doctors: Doctor[];
    schedules: { [doctorId: string]: DoctorSchedule };
    onSave: (doctors: Doctor[], schedules: { [doctorId: string]: DoctorSchedule }) => void;
    onBack: () => void;
}

type WizardStep = 'welcome' | 'doctors' | 'schedules';

const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// --- HELPER FUNCTIONS ---
const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
};

/**
 * Checks for any overlapping time slots in a given array.
 * This is more robust than a simple adjacent check, handling cases where
 * slots might be nested or involved in a chain of overlaps.
 * @param slots - An array of TimeSlot objects.
 * @returns An array of indices corresponding to the overlapping slots.
 */
const checkForOverlaps = (slots: TimeSlot[]): number[] => {
    if (slots.length < 2) return [];

    const sortedSlots = slots
        .map((slot, index) => ({ ...slot, originalIndex: index }))
        .sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));

    const overlappingIndices = new Set<number>();

    for (let i = 0; i < sortedSlots.length; i++) {
        for (let j = i + 1; j < sortedSlots.length; j++) {
            const slot1 = sortedSlots[i];
            const slot2 = sortedSlots[j];

            // If slot2 starts before slot1 has ended, it's an overlap.
            // Because slots are sorted by start time, if slot2 starts after slot1 ends,
            // no subsequent slots can possibly overlap with slot1, so we can break early.
            if (timeToMinutes(slot1.endTime) > timeToMinutes(slot2.startTime)) {
                overlappingIndices.add(slot1.originalIndex);
                overlappingIndices.add(slot2.originalIndex);
            } else {
                break; // Optimization for sorted array
            }
        }
    }

    return Array.from(overlappingIndices);
};

// --- WIZARD UI COMPONENTS ---
const WizardStepIndicator: React.FC<{ currentStep: WizardStep }> = ({ currentStep }) => {
    const steps: { id: WizardStep, label: string }[] = [
        { id: 'doctors', label: 'Add Doctors' },
        { id: 'schedules', label: 'Set Schedules' },
    ];
    const currentStepIndex = steps.findIndex(s => s.id === currentStep);

    return (
        <nav aria-label="Progress">
            <ol role="list" className="flex items-center justify-center">
                {steps.map((step, stepIdx) => {
                    const isCompleted = stepIdx < currentStepIndex;
                    const isCurrent = stepIdx === currentStepIndex;

                    return (
                        <li key={step.label} className={`relative ${stepIdx !== steps.length - 1 ? 'flex-1' : ''}`}>
                            {/* Line connecting the steps */}
                            {stepIdx !== steps.length - 1 && (
                                <div className="absolute inset-0 flex items-center translate-x-1/2" aria-hidden="true">
                                    <div className={`h-0.5 w-full ${isCompleted ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`} />
                                </div>
                            )}

                            {/* Step Icon and Label container */}
                            <div className="relative flex flex-col items-center group">
                                {/* Step Icon */}
                                <div className={`relative flex h-8 w-8 items-center justify-center rounded-full z-10 transition-colors ${isCompleted || isCurrent ? 'bg-blue-600 border-blue-600' : 'bg-white dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600'}`}>
                                    {isCompleted ? (
                                        <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.052-.143z" clipRule="evenodd" /></svg>
                                    ) : isCurrent ? (
                                        <span className="h-2.5 w-2.5 rounded-full bg-white" aria-hidden="true" />
                                    ) : (
                                        <span className="h-2.5 w-2.5 rounded-full bg-transparent" aria-hidden="true" />
                                    )}
                                </div>

                                {/* Step Label */}
                                <div className="mt-2 text-center">
                                    <span className={`text-[10px] sm:text-xs uppercase tracking-wider ${isCurrent ? 'font-bold text-blue-600 dark:text-blue-400'
                                        : isCompleted ? 'font-semibold text-slate-700 dark:text-slate-300'
                                            : 'font-medium text-slate-500 dark:text-slate-400'
                                        }`}>
                                        {step.label}
                                    </span>
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
};


// --- NEW SCHEDULE EDITOR COMPONENTS ---
const TimeSlotEditor: React.FC<{
    slot: TimeSlot,
    onSlotChange: (newSlot: TimeSlot) => void,
    onRemove: () => void,
    timeOptions: string[],
    isOverlapping: boolean,
}> = ({ slot, onSlotChange, onRemove, timeOptions, isOverlapping }) => {
    const inputClasses = "w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-sm";
    const overlapClasses = isOverlapping ? '!border-red-500 ring-2 ring-red-500' : '';

    return (
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-center p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg">
            <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Start Time</label>
                <select value={slot.startTime} onChange={e => onSlotChange({ ...slot, startTime: e.target.value })} className={`${inputClasses} ${overlapClasses}`}>
                    {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>
            <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">End Time</label>
                <select value={slot.endTime} onChange={e => onSlotChange({ ...slot, endTime: e.target.value })} className={`${inputClasses} ${overlapClasses}`}>
                    {timeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>
            <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Room</label>
                <input type="text" value={slot.room} onChange={e => onSlotChange({ ...slot, room: e.target.value })} className={inputClasses} />
            </div>
            <div>
                <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Max Patients</label>
                <input type="number" value={slot.maxPatients} onChange={e => onSlotChange({ ...slot, maxPatients: parseInt(e.target.value, 10) || 0 })} className={inputClasses} />
            </div>
            <div className="sm:self-end">
                <button onClick={onRemove} className="w-full text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-500 p-2 rounded-lg bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-900 flex items-center justify-center gap-1 text-sm">
                    <TrashIcon className="w-4 h-4" /> Remove
                </button>
            </div>
        </div>
    );
};

export const ClinicConfigScreen: React.FC<ClinicConfigScreenProps> = ({ doctors, schedules, onSave, onBack }) => {
    const [step, setStep] = useState<WizardStep>('welcome');
    const [localDoctors, setLocalDoctors] = useState<Doctor[]>([]);
    const [localSchedules, setLocalSchedules] = useState<{ [doctorId: string]: DoctorSchedule }>({});
    const [unavailableDaysByDoctor, setUnavailableDaysByDoctor] = useState<{ [doctorId: string]: Set<string> }>({});
    const [newDoctorName, setNewDoctorName] = useState('');
    const [newDoctorSpecialty, setNewDoctorSpecialty] = useState('');
    const [newDoctorPhone, setNewDoctorPhone] = useState('');
    const [activeScheduleDoctorId, setActiveScheduleDoctorId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const overlappingDays = useMemo((): { [key: string]: number[] } => {
        if (!activeScheduleDoctorId) return {};
        const schedule = localSchedules[activeScheduleDoctorId];
        if (!schedule) return {};

        const entries = daysOfWeek.map((day): [string, number[]] => {
            const slots = schedule[day] || [];
            return [day, checkForOverlaps(slots)];
        });
        return Object.fromEntries(entries);
    }, [localSchedules, activeScheduleDoctorId]);

    const hasAnyOverlaps = Object.values(overlappingDays).some(indices => Array.isArray(indices) && indices.length > 0);

    const timeOptions = useMemo(() => {
        const options = [];
        for (let h = 0; h < 24; h++) {
            for (let m = 0; m < 60; m += 15) {
                const time = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                options.push(time);
            }
        }
        return options;
    }, []);

    useEffect(() => {
        fetchDoctors();
    }, []);


    const fetchDoctors = async () => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_BASE_URL}/doctors/`,
                {
                    method: "GET",
                    headers: {
                        accept: "application/json",
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Failed to fetch doctors");
            }

            const data = await response.json();

            const formattedDoctors: Doctor[] = data.map((doctor: any) => ({
                id: doctor.id,
                name: doctor.name,
                specialty: doctor.specialty,
                phone: doctor.phone,
                isAvailable: true,
            }));

            setLocalDoctors(formattedDoctors);
        } catch (error) {
            console.error(error);
            setError("Error fetching doctors");
        }
    };

    // useEffect(() => {
    //     setLocalDoctors(JSON.parse(JSON.stringify(doctors)));
    //     setLocalSchedules(JSON.parse(JSON.stringify(schedules)));
    //     setUnavailableDaysByDoctor({});
    // }, [doctors, schedules]);

    //   const handleAddDoctor = () => {
    //     setError(null);
    //     if (!newDoctorName.trim() || !newDoctorSpecialty.trim()) {
    //       setError("Please enter both a name and a specialty.");
    //       return;
    //     }
    //     const newDoctor: Doctor = { 
    //         id: Date.now().toString(), 
    //         name: newDoctorName, 
    //         specialty: newDoctorSpecialty,
    //         phone: newDoctorPhone,
    //         isAvailable: true 
    //     };

    //     const defaultSchedule: DoctorSchedule = daysOfWeek.reduce((acc, day) => ({ ...acc, [day]: [] }), {} as DoctorSchedule);

    //     setLocalDoctors(prevDoctors => [...prevDoctors, newDoctor]);
    //     setLocalSchedules(prevSchedules => ({ ...prevSchedules, [newDoctor.id]: defaultSchedule }));
    //     setUnavailableDaysByDoctor(prev => ({ ...prev, [newDoctor.id]: new Set() }));

    //     setNewDoctorName('');
    //     setNewDoctorSpecialty('');
    //     setNewDoctorPhone('');
    //   };

    const handleAddDoctor = async () => {
        setError(null);

        if (!newDoctorName.trim() || !newDoctorSpecialty.trim()) {
            setError("Please enter both a name and a specialty.");
            return;
        }

        try {
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/doctors/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    accept: "application/json",
                },
                body: JSON.stringify({
                    name: newDoctorName,
                    specialty: newDoctorSpecialty,
                    phone: newDoctorPhone,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to add doctor");
            }

            const savedDoctor = await response.json();

            const newDoctor: Doctor = {
                id: savedDoctor.id,
                name: savedDoctor.name,
                specialty: savedDoctor.specialty,
                phone: savedDoctor.phone,
                isAvailable: true,
            };

            const defaultSchedule: DoctorSchedule = daysOfWeek.reduce(
                (acc, day) => ({ ...acc, [day]: [] }),
                {} as DoctorSchedule
            );

            setLocalDoctors((prevDoctors) => [...prevDoctors, newDoctor]);

            setLocalSchedules((prevSchedules) => ({
                ...prevSchedules,
                [newDoctor.id]: defaultSchedule,
            }));

            setUnavailableDaysByDoctor((prev) => ({
                ...prev,
                [newDoctor.id]: new Set(),
            }));

            setNewDoctorName("");
            setNewDoctorSpecialty("");
            setNewDoctorPhone("");
        } catch (error) {
            console.error(error);
            setError("Error adding doctor");
        }
    };

    const handleRemoveDoctor = (id: string) => {
        const newDoctors = localDoctors.filter(d => d.id !== id);
        setLocalDoctors(newDoctors);

        const newSchedules = { ...localSchedules };
        delete newSchedules[id];
        setLocalSchedules(newSchedules);

        const newUnavailable = { ...unavailableDaysByDoctor };
        delete newUnavailable[id];
        setUnavailableDaysByDoctor(newUnavailable);

        if (activeScheduleDoctorId === id) {
            setActiveScheduleDoctorId(newDoctors.length > 0 ? newDoctors[0].id : null);
        }
    };

    const handleDoctorAvailabilityToggle = (id: string) => {
        setLocalDoctors(prevDoctors =>
            prevDoctors.map(doc =>
                doc.id === id ? { ...doc, isAvailable: !doc.isAvailable } : doc
            )
        );
    };

    const handleDayAvailabilityToggle = (day: string) => {
        if (!activeScheduleDoctorId) return;
        setUnavailableDaysByDoctor(prev => {
            const newSets = { ...prev };
            const doctorSet = new Set(newSets[activeScheduleDoctorId] || []);
            if (doctorSet.has(day)) {
                doctorSet.delete(day);
            } else {
                doctorSet.add(day);
                // Also clear any slots when making unavailable
                handleDaySlotsChange(day, []);
            }
            newSets[activeScheduleDoctorId] = doctorSet;
            return newSets;
        });
    };

    const handleDaySlotsChange = (day: string, slots: TimeSlot[]) => {
        if (!activeScheduleDoctorId) return;
        setLocalSchedules(prev => ({
            ...prev,
            [activeScheduleDoctorId]: {
                ...(prev[activeScheduleDoctorId] || {}),
                [day]: slots
            }
        }));
    };

    const handleAddSlot = (day: string) => {
        if (!activeScheduleDoctorId) return;
        const currentSlots = localSchedules[activeScheduleDoctorId]?.[day] || [];
        const lastSlot = currentSlots[currentSlots.length - 1];
        const newStartTime = lastSlot ? lastSlot.endTime : '09:00';
        const newEndTimeMinutes = timeToMinutes(newStartTime) + 60;
        const newEndTime = timeOptions.find(t => timeToMinutes(t) >= newEndTimeMinutes) || '10:00';

        const newSlot: TimeSlot = { startTime: newStartTime, endTime: newEndTime, room: 'Room 1', maxPatients: 10, type: 'available' };
        handleDaySlotsChange(day, [...currentSlots, newSlot]);
    };

    const handleCopyToAll = (sourceDay: string) => {
        if (!activeScheduleDoctorId) return;
        const sourceSlots = localSchedules[activeScheduleDoctorId]?.[sourceDay] || [];
        const newSchedule = { ...localSchedules[activeScheduleDoctorId] };
        const newUnavailable = new Set(unavailableDaysByDoctor[activeScheduleDoctorId] || []);

        daysOfWeek.forEach(day => {
            newSchedule[day] = JSON.parse(JSON.stringify(sourceSlots));
        });

        if (newUnavailable.has(sourceDay)) {
            daysOfWeek.forEach(day => newUnavailable.add(day));
        } else {
            daysOfWeek.forEach(day => newUnavailable.delete(day));
        }

        setLocalSchedules(prev => ({ ...prev, [activeScheduleDoctorId]: newSchedule }));
        setUnavailableDaysByDoctor(prev => ({ ...prev, [activeScheduleDoctorId]: newUnavailable }));
    };

    const handleFinish = () => {
        setError(null);
        if (hasAnyOverlaps) {
            setError("Please resolve the overlapping time slots (highlighted in red) before saving.");
            return;
        }
        // Final cleanup: ensure unavailable days have empty slots array
        const finalSchedules = JSON.parse(JSON.stringify(localSchedules));
        Object.entries(unavailableDaysByDoctor).forEach(([doctorId, unavailableDays]) => {
            // Fix: Cast unavailableDays to Set<string> to resolve TypeScript type inference issue with Object.entries.
            (unavailableDays as Set<string>).forEach(day => {
                if (finalSchedules[doctorId]) {
                    finalSchedules[doctorId][day] = [];
                }
            });
        });

        onSave(localDoctors, finalSchedules);
        setSuccessMessage("Configuration saved successfully!");
        setTimeout(() => {
            setSuccessMessage(null);
            onBack();
        }, 2000);
    };

    const renderWelcomeStep = () => (
        <div className="text-center p-8">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Set Up Your Clinic</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400">This guided setup will help you add doctors and configure their weekly schedules.</p>
            <button onClick={() => setStep('doctors')} className="mt-6 bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 transition-colors shadow-md text-lg flex items-center gap-2 mx-auto">
                Get Started <RightArrowIcon className="w-5 h-5" />
            </button>
        </div>
    );

    const renderDoctorsStep = () => (
        <div className="space-y-6">
            <div className="p-4 pt-8 mb-4">
                <WizardStepIndicator currentStep="doctors" />
            </div>
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Step 1: Add Your Doctors</h3>
            <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div className="md:col-span-1">
                        <label htmlFor="doc-name" className="block text-sm font-medium text-slate-600 dark:text-slate-300">Doctor's Name</label>
                        <input id="doc-name" type="text" value={newDoctorName} onChange={e => setNewDoctorName(e.target.value)} className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800" placeholder="e.g., Dr. Jane Doe" />
                    </div>
                    <div className="md:col-span-1">
                        <label htmlFor="doc-spec" className="block text-sm font-medium text-slate-600 dark:text-slate-300">Specialty</label>
                        <input id="doc-spec" type="text" value={newDoctorSpecialty} onChange={e => setNewDoctorSpecialty(e.target.value)} className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800" placeholder="e.g., Cardiology" />
                    </div>
                    <div className="md:col-span-1">
                        <label htmlFor="doc-phone" className="block text-sm font-medium text-slate-600 dark:text-slate-300">Phone Number (Optional)</label>
                        <input id="doc-phone" type="tel" value={newDoctorPhone} onChange={e => setNewDoctorPhone(e.target.value)} className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800" placeholder="+1555..." />
                    </div>
                    <button onClick={handleAddDoctor} className="w-full md:w-auto bg-blue-100 text-blue-700 font-semibold py-2 px-4 rounded-lg hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900 flex items-center justify-center gap-1">
                        <PlusIcon className="w-5 h-5" /> Add Doctor
                    </button>
                </div>
            </div>
            <div className="space-y-2">
                <h4 className="font-semibold text-slate-700 dark:text-slate-300">Clinic Doctors ({localDoctors.length})</h4>
                {localDoctors.map(doctor => (
                    <div key={doctor.id} className={`flex items-center justify-between p-3 rounded-md border transition-opacity ${doctor.isAvailable ? 'bg-white dark:bg-slate-700/50 border-slate-200 dark:border-slate-700' : 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 opacity-60'}`}>
                        <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200">{doctor.name}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{doctor.specialty} {doctor.phone && `• ${doctor.phone}`}</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="flex items-center">
                                <span className={`text-sm font-semibold mr-2 ${doctor.isAvailable ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                    {doctor.isAvailable ? 'Available' : 'Unavailable'}
                                </span>
                                <button
                                    id={`availability-toggle-${doctor.id}`}
                                    onClick={() => handleDoctorAvailabilityToggle(doctor.id)}
                                    className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 ${doctor.isAvailable ? 'bg-green-500' : 'bg-slate-400 dark:bg-slate-600'}`}
                                    role="switch"
                                    aria-checked={doctor.isAvailable}
                                >
                                    <span className="sr-only">Toggle Availability</span>
                                    <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${doctor.isAvailable ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                            <button onClick={() => handleRemoveDoctor(doctor.id)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-500 p-2 rounded-full"><TrashIcon className="w-5 h-5" /></button>
                        </div>
                    </div>
                ))}
                {localDoctors.length === 0 && <p className="text-center text-slate-500 dark:text-slate-400 p-4">No doctors added yet.</p>}
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700">
                <button onClick={onBack} className="text-sm bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500">Back to Dashboard</button>
                <button onClick={() => { setActiveScheduleDoctorId(localDoctors[0]?.id || null); setStep('schedules'); }} disabled={localDoctors.length === 0} className="bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
            </div>
        </div>
    );

    const renderSchedulesStep = () => {
        if (!activeScheduleDoctorId) {
            return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Please add a doctor to begin setting up schedules.</div>
        }
        const activeDoctorUnavailableDays = unavailableDaysByDoctor[activeScheduleDoctorId] || new Set();

        return (
            <div className="space-y-6">
                <div className="p-4 pt-8 mb-4">
                    <WizardStepIndicator currentStep="schedules" />
                </div>
                <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Step 2: Set Weekly Schedules</h3>
                <div className="border-b border-slate-200 dark:border-slate-700">
                    <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Doctors">
                        {localDoctors.map(doc => (
                            <button
                                key={doc.id}
                                onClick={() => setActiveScheduleDoctorId(doc.id)}
                                className={`whitespace-nowrap py-3 px-4 font-semibold text-sm rounded-t-lg transition-colors ${activeScheduleDoctorId === doc.id ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 border-t border-x text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'}`}
                            >
                                {doc.name}
                            </button>
                        ))}
                    </nav>
                </div>

                {hasAnyOverlaps && (
                    <div className="p-3 rounded-md text-sm bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 flex items-center gap-2">
                        <AlertIcon className="w-5 h-5 flex-shrink-0" />
                        Overlapping time slots detected. Please resolve conflicts before saving.
                    </div>
                )}

                <div className="space-y-4">
                    {daysOfWeek.map(day => {
                        const slots = localSchedules[activeScheduleDoctorId]?.[day] || [];
                        const isUnavailable = activeDoctorUnavailableDays.has(day);
                        const overlappingIndices = overlappingDays[day] || [];

                        return (
                            <div key={day} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                                <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                                    <div className="flex items-center gap-4">
                                        <h4 className="font-bold text-lg text-slate-800 dark:text-slate-200 w-28">{day}</h4>
                                        <button onClick={() => handleDayAvailabilityToggle(day)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 ${!isUnavailable ? 'bg-green-500' : 'bg-slate-400 dark:bg-slate-600'}`} role="switch" aria-checked={!isUnavailable}>
                                            <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${!isUnavailable ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                        <span className={`text-sm font-semibold ${!isUnavailable ? 'text-green-600 dark:text-green-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                            {isUnavailable ? 'Unavailable' : 'Available'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => handleCopyToAll(day)} className="text-sm bg-slate-200 text-slate-700 font-semibold py-1.5 px-3 rounded-lg hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500 flex items-center gap-1.5">
                                            <CopyIcon className="w-4 h-4" /> Copy to All Days
                                        </button>
                                        <button onClick={() => handleAddSlot(day)} disabled={isUnavailable} className="text-sm bg-blue-100 text-blue-700 font-semibold py-1.5 px-3 rounded-lg hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed">
                                            + Add Slot
                                        </button>
                                    </div>
                                </div>

                                {!isUnavailable && (
                                    <div className="space-y-3 pl-2">
                                        {slots.map((slot, index) => (
                                            <TimeSlotEditor
                                                key={index}
                                                slot={slot}
                                                timeOptions={timeOptions}
                                                isOverlapping={overlappingIndices.includes(index)}
                                                onSlotChange={(newSlot) => {
                                                    const newSlots = [...slots];
                                                    newSlots[index] = newSlot;
                                                    handleDaySlotsChange(day, newSlots);
                                                }}
                                                onRemove={() => {
                                                    const newSlots = [...slots];
                                                    newSlots.splice(index, 1);
                                                    handleDaySlotsChange(day, newSlots);
                                                }}
                                            />
                                        ))}
                                        {slots.length === 0 && <p className="text-sm text-center text-slate-500 dark:text-slate-400 py-4">No slots added for this day.</p>}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="flex justify-between items-center pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button onClick={() => setStep('doctors')} className="text-sm bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500">Back</button>
                    <button onClick={handleFinish} className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed" disabled={hasAnyOverlaps}>
                        Finish & Save
                    </button>
                </div>
            </div>
        )
    };

    return (
        <div className="max-w-4xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 md:p-8 space-y-8 animate-fade-in text-slate-900 dark:text-white">
            <ErrorFeedback message={error} onDismiss={() => setError(null)} />
            {successMessage && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 dark:bg-green-900/20 dark:border-green-900/50 dark:text-green-300">
                    {successMessage}
                </div>
            )}
            {step === 'welcome' && renderWelcomeStep()}
            {step === 'doctors' && renderDoctorsStep()}
            {step === 'schedules' && renderSchedulesStep()}
        </div>
    );
};
