import React from 'react';
import { RecordButton } from './RecordButton';

interface CorrectionInputProps {
    id?: string;
    isCorrecting: boolean;
    isProcessing: boolean;
    currentText: string;
    onToggleRecord: () => void;
    onTextChange: (text: string) => void;
}

export const CorrectionInput: React.FC<CorrectionInputProps> = ({ id, isCorrecting, isProcessing, currentText, onToggleRecord, onTextChange }) => {
    const stoppedButtonText = currentText.trim() ? 'Finalize' : 'Correct';
    const tooltip = isCorrecting 
        ? "Click to finalize the voice correction."
        : currentText.trim()
        ? "Submit the typed correction."
        : "Click to start recording your voice for correction.";
    
    const headingId = React.useId();
    const descriptionId = React.useId();

    return (
        <div 
            id={id} 
            className="bg-blue-50 dark:bg-blue-900/50 border-2 border-dashed border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3"
            aria-busy={isProcessing}
        >
            <div className="flex items-center space-x-4">
                <RecordButton 
                    status={isCorrecting ? 'recording' : 'idle'} 
                    onClick={onToggleRecord}
                    stoppedText={stoppedButtonText}
                    recordingText="Finalize"
                    tooltipText={tooltip}
                    disabled={isProcessing}
                />
                <div className="flex-1">
                    <h5 id={headingId} className="font-semibold text-slate-700 dark:text-slate-300">Correct Prescription</h5>
                    <p id={descriptionId} className="text-sm text-slate-500 dark:text-slate-400">
                        {isProcessing
                            ? 'Processing correction...'
                            : isCorrecting
                            ? 'Listening for voice input... You can also type below.'
                            : 'Click "Correct" to speak, or type your changes and click "Finalize".'}
                    </p>
                </div>
            </div>
            <textarea
                className="w-full p-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-200 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition disabled:bg-slate-100 dark:disabled:bg-slate-700"
                value={currentText}
                onChange={(e) => onTextChange(e.target.value)}
                placeholder="Start speaking or type the full, corrected prescription here..."
                rows={4}
                disabled={isProcessing}
                aria-labelledby={headingId}
                aria-describedby={descriptionId}
            />
        </div>
    );
};
