
import { PatientInfo } from '../types';

export function findOrCreatePatient(info: { name: string, phone: string, age?: string, gender?: string }, patients: PatientInfo[]): { finalPatientInfo: PatientInfo, updatedPatientList: PatientInfo[] } {
  const existingPatient = patients.find(p => p.phone === info.phone);
  if (existingPatient) {
    return { finalPatientInfo: existingPatient, updatedPatientList: patients };
  }
  const newPatient: PatientInfo = {
    ...info,
    age: info.age || '0',
    gender: info.gender || 'Unknown',
    patientId: `p-${Date.now()}`
  };
  return { finalPatientInfo: newPatient, updatedPatientList: [...patients, newPatient] };
}
