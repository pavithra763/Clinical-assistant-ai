import React, { useState, useEffect } from 'react';

interface ShareModalProps {
    isOpen: boolean;
    target: 'pharmacy' | 'nursing' | 'patient';
    initialNumber: string;
    onClose: () => void;
    onSend: (number: string, saveAsDefault: boolean) => void;
}

const CloseIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"></path>
    </svg>
);

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, target, initialNumber, onClose, onSend }) => {
    const [number, setNumber] = useState(initialNumber);
    const [saveAsDefault, setSaveAsDefault] = useState(true);

    useEffect(() => {
        setNumber(initialNumber);
    }, [initialNumber, isOpen]);

    if (!isOpen) {
        return null;
    }

    const handleSend = () => {
        if (number.trim()) {
            onSend(number, saveAsDefault);
        } else {
            alert('Please enter a valid phone number.');
        }
    };
    
    const targetDetails = {
        pharmacy: { name: 'Pharmacy', friendlyName: 'the Pharmacy' },
        nursing: { name: 'Nursing Station', friendlyName: 'the Nursing Station' },
        patient: { name: 'Patient/Caretaker', friendlyName: 'the Patient/Caretaker' }
    };

    const { name: targetName, friendlyName: targetFriendlyName } = targetDetails[target];

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-70" 
            aria-modal="true"
            role="dialog"
        >
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-sm m-4">
                <div className="flex justify-between items-center p-4 border-b dark:border-slate-700">
                    <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Share with {targetName}</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700" aria-label={`Close share dialog`}>
                        <CloseIcon className="w-6 h-6 text-slate-600 dark:text-slate-400" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label htmlFor="share-number" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            {targetName} WhatsApp Number
                        </label>
                        <input
                            type="tel"
                            id="share-number"
                            value={number}
                            onChange={(e) => setNumber(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 text-slate-900 dark:text-slate-200 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="+15551234567"
                            autoFocus
                        />
                         <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Include country code for international numbers.</p>
                    </div>
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="save-default"
                            checked={saveAsDefault}
                            onChange={(e) => setSaveAsDefault(e.target.checked)}
                            className="h-4 w-4 text-blue-600 border-slate-300 dark:border-slate-500 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="save-default" className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
                            Save as default number for {targetFriendlyName}
                        </label>
                    </div>
                </div>
                <div className="flex justify-end items-center p-4 bg-slate-50 dark:bg-slate-900/50 border-t dark:border-slate-700 rounded-b-lg space-x-3">
                    <button
                        onClick={onClose}
                        className="bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg hover:bg-slate-300 dark:bg-slate-600 dark:text-slate-200 dark:hover:bg-slate-500 transition-colors duration-300"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSend}
                        className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 transition-colors duration-300 shadow-md"
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};