import React from 'react';
import { motion } from 'motion/react';
import { AlertCircle, X } from 'lucide-react';

interface ErrorFeedbackProps {
    message: string | null | undefined;
    onDismiss: () => void;
}

export const ErrorFeedback: React.FC<ErrorFeedbackProps> = ({ message, onDismiss }) => {
    if (!message) return null;
    return (
        <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between gap-3 text-red-700 dark:bg-red-900/20 dark:border-red-900/50 dark:text-red-300"
        >
            <div className="flex items-center gap-2">
                <AlertCircle size={20} className="shrink-0" />
                <span className="text-sm font-medium">{message}</span>
            </div>
            <button onClick={onDismiss} className="text-red-400 hover:text-red-600 transition-colors shrink-0">
                <X size={18} />
            </button>
        </motion.div>
    );
};
