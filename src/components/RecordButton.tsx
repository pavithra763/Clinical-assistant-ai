import React from 'react';
import { motion } from 'motion/react';
import { Tooltip } from './Tooltip';
import { Mic, Pause, Play } from 'lucide-react';

type RecordingStatus = 'idle' | 'recording' | 'paused';

interface RecordButtonProps {
  status: RecordingStatus;
  onClick: () => void;
  disabled?: boolean;
  stoppedText?: string;
  recordingText?: string;
  pausedText?: string;
  tooltipText?: string;
}

export const RecordButton: React.FC<RecordButtonProps> = ({ 
  status, 
  onClick, 
  disabled = false,
  stoppedText,
  recordingText,
  pausedText,
  tooltipText: tooltipOverride,
}) => {
  let text = '';
  let Icon = Mic;
  let buttonColorClasses = '';
  let tooltipText = '';

  if (status === 'recording') {
    text = recordingText ?? 'Pause';
    Icon = Pause;
    buttonColorClasses = 'bg-red-600 shadow-red-200 dark:shadow-none';
    tooltipText = 'Pause the recording';
  } else if (status === 'paused') {
    text = pausedText ?? 'Resume';
    Icon = Play;
    buttonColorClasses = 'bg-blue-600 shadow-blue-200 dark:shadow-none';
    tooltipText = 'Resume recording';
  } else {
    text = stoppedText ?? 'Start Recording';
    Icon = Mic;
    buttonColorClasses = 'bg-blue-600 shadow-blue-200 dark:shadow-none';
    tooltipText = 'Begin clinical recording';
  }

  const pulseVariants = {
    recording: {
      scale: [1, 1.05, 1],
      transition: { repeat: Infinity, duration: 1.5 }
    }
  };

  return (
    <Tooltip text={tooltipOverride ?? tooltipText}>
      <motion.button
        onClick={onClick}
        disabled={disabled}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        animate={status === 'recording' ? 'recording' : ''}
        variants={pulseVariants}
        className={`group relative flex h-20 w-64 items-center justify-center overflow-hidden rounded-2xl border-b-4 border-black/20 font-display text-lg font-bold text-white transition-all disabled:opacity-50 ${buttonColorClasses}`}
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-black/10 to-transparent pointer-events-none" />
        
        {status === 'recording' && (
          <motion.div 
            className="absolute inset-0 bg-red-400/20"
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ repeat: Infinity, duration: 2 }}
          />
        )}

        <div className="relative flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
            <Icon size={24} />
          </div>
          <span className="tracking-tight uppercase">{text}</span>
        </div>
      </motion.button>
    </Tooltip>
  );
};
