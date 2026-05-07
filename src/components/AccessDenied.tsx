import React from 'react';

interface AccessDeniedProps {
    onBack: () => void;
}

const ShieldIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zM11 7h2v6h-2V7zm0 8h2v2h-2v-2z"/></svg>
);

export const AccessDenied: React.FC<AccessDeniedProps> = ({ onBack }) => {
    return (
        <div className="max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 md:p-8 space-y-8 animate-fade-in text-center">
            <ShieldIcon className="w-20 h-20 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Access Denied</h2>
            <p className="text-slate-600 dark:text-slate-400">
                You do not have the required permissions to view this page. Please contact an administrator if you believe this is an error.
            </p>
            <button
                onClick={onBack}
                className="mt-4 bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors shadow-md"
            >
                Return to Dashboard
            </button>
        </div>
    );
};
