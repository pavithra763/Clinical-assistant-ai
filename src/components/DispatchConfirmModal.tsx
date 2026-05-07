import React, { useState, useEffect } from 'react';

const CloseIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24" fill="currentColor">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"></path>
    </svg>
);

interface DispatchConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: (number: string) => void;
    title: string;
    content: string;
    initialNumber: string;
}

export const DispatchConfirmModal: React.FC<DispatchConfirmModalProps> = ({ isOpen, onClose, onSend, title, content, initialNumber }) => {
    const [number, setNumber] = useState(initialNumber);

    useEffect(() => {
        setNumber(initialNumber);
    }, [initialNumber, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md m-4">
                <header className="flex justify-between items-center p-4 border-b dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Confirm Dispatch</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Close">
                        <CloseIcon className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                    </button>
                </header>
                <div className="p-6 space-y-4">
                    <div>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">You are about to send the following order:</p>
                        <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700 rounded-md max-h-40 overflow-y-auto">
                            <h5 className="font-semibold text-slate-800 dark:text-slate-200">{title}</h5>
                            <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{content}</p>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="dispatch-number" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Department WhatsApp Number
                        </label>
                        <input
                            type="tel"
                            id="dispatch-number"
                            value={number}
                            onChange={(e) => setNumber(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm"
                            autoFocus
                        />
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            This number is pre-filled from Settings. You can edit it for this dispatch.
                        </p>
                    </div>
                </div>
                <footer className="flex justify-end items-center p-4 bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-700 rounded-b-lg space-x-3">
                    <button onClick={onClose} className="bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500">
                        Cancel
                    </button>
                    <button onClick={() => onSend(number)} className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 shadow-md">
                        Send via WhatsApp
                    </button>
                </footer>
            </div>
        </div>
    );
};