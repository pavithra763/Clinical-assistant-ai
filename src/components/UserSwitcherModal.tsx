import React from 'react';
import type { User, Role } from '../types';
import { t } from '../utils/i18n';

interface UserSwitcherModalProps {
    isOpen: boolean;
    onClose: () => void;
    users: User[];
    roles: Role[];
    currentUser: User | null;
    onSelectUser: (user: User) => void;
    lang?: string;
}

const CloseIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"></path></svg>
);

const UserCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 4c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
);

export const UserSwitcherModal: React.FC<UserSwitcherModalProps> = ({ isOpen, onClose, users, roles, currentUser, onSelectUser, lang = 'English' }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-sm m-4">
                <header className="flex justify-between items-center p-4 border-b dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{t('switch', lang)}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Close user switcher">
                        <CloseIcon className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                    </button>
                </header>
                <div className="p-4 max-h-[60vh] overflow-y-auto">
                    <ul className="space-y-2">
                        {users.map(user => {
                            const role = roles.find(r => r.id === user.roleId);
                            const isCurrentUser = currentUser?.id === user.id;
                            return (
                                <li key={user.id}>
                                    <button
                                        onClick={() => onSelectUser(user)}
                                        className={`w-full flex items-center p-3 rounded-lg text-left transition-colors ${
                                            isCurrentUser 
                                            ? 'bg-blue-100 dark:bg-blue-900/50' 
                                            : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                                        }`}
                                    >
                                        <UserCircleIcon className={`w-8 h-8 mr-3 ${isCurrentUser ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} />
                                        <div>
                                            <p className={`font-semibold ${isCurrentUser ? 'text-blue-800 dark:text-blue-200' : 'text-slate-800 dark:text-slate-200'}`}>{user.name}</p>
                                            <p className={`text-sm ${isCurrentUser ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>{role?.name || 'Unknown Role'}</p>
                                        </div>
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>
        </div>
    );
};
