import type { Permission } from '../types';

export const ALL_PERMISSIONS: { id: Permission; description: string; category: string }[] = [
    { 
        id: 'viewDashboard', 
        description: 'Can view the main appointments dashboard.',
        category: 'General'
    },
    { 
        id: 'manageAppointments', 
        description: 'Can create, edit, and cancel patient appointments.',
        category: 'Reception'
    },
    { 
        id: 'manageClinicConfig', 
        description: 'Can add/remove doctors and set their weekly schedules.',
        category: 'Admin'
    },
    { 
        id: 'manageUsersAndRoles', 
        description: 'Can add/remove users and manage role permissions.',
        category: 'Admin'
    },
    { 
        id: 'performIntake', 
        description: 'Can access the nurse intake screen and record patient vitals.',
        category: 'Clinical'
    },
    { 
        id: 'startConsultation', 
        description: 'Can access the main consultation screen to record and analyze conversations.',
        category: 'Clinical'
    },
    { 
        id: 'dispatchOrders', 
        description: 'Can access the dispatch screen to send orders to other departments.',
        category: 'Clinical'
    },
];
