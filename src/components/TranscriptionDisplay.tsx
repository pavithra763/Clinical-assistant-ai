
import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import type { Turn } from '../types';
import type { AIService } from '../services/aiService';

interface TranscriptionDisplayProps {
  turns: Turn[];
  currentTranscription: string;
  isRecording: boolean;
  aiService: AIService | null;
  onTurnsChange?: (turns: Turn[]) => void;
  onClearCurrentTranscription?: () => void;
}

const speakerColors = [
  'text-sky-600 dark:text-sky-400',
  'text-emerald-600 dark:text-emerald-400',
  'text-amber-600 dark:text-amber-400',
  'text-rose-600 dark:text-rose-400',
  'text-indigo-600 dark:text-indigo-400',
];

const getSpeakerColor = (speaker: string): string => {
  const speakerNum = parseInt(speaker.replace('Speaker ', ''), 10);
  if (isNaN(speakerNum)) return 'text-slate-900 dark:text-slate-100';
  return speakerColors[(speakerNum - 1) % speakerColors.length];
};

export const TranscriptionDisplay: React.FC<TranscriptionDisplayProps> = ({ turns, currentTranscription, isRecording, aiService, onTurnsChange, onClearCurrentTranscription }) => {
  const showDisplay = turns.length > 0 || currentTranscription || isRecording;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [displayText, setDisplayText] = useState(currentTranscription);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [turns, displayText]);

  useEffect(() => {
    setDisplayText(currentTranscription);
    if (!currentTranscription.trim() || !aiService) return;

    const handler = setTimeout(async () => {
      try {
        const corrected = await aiService.spellCheck(currentTranscription);
        if (corrected) setDisplayText(corrected);
      } catch (e) {
        console.error("Spell check failed:", e);
      }
    }, 800);

    return () => clearTimeout(handler);
  }, [currentTranscription, aiService]);

  const handleEditStart = (index: number, text: string) => {
    setEditingIndex(index);
    setEditValue(text);
  };

  const handleEditSave = (index: number) => {
    if (onTurnsChange) {
      const newTurns = [...turns];
      newTurns[index] = { ...newTurns[index], text: editValue };
      onTurnsChange(newTurns);
    }
    setEditingIndex(null);
    if (onClearCurrentTranscription) {
        onClearCurrentTranscription();
    }
  };

  if (!showDisplay) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Live Transcription</h3>
        {isRecording && (
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="text-[10px] font-bold text-red-500 uppercase">Input Active</span>
          </div>
        )}
      </div>
      
      <div 
        ref={scrollContainerRef}
        className="relative bg-slate-900 rounded-2xl p-6 h-72 overflow-y-auto font-mono text-sm leading-relaxed"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-500/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="space-y-4 relative z-10">
          <AnimatePresence initial={false}>
            {turns.map((turn, index) => (
              <motion.div 
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex gap-4 group"
              >
                <span className="text-[10px] text-slate-600 mt-1 select-none w-14 shrink-0">
                  {turn.timestamp || '00:00:00'}
                </span>
                <div className="flex-1">
                  <span className={`font-bold ${getSpeakerColor(turn.speaker)}`}>{turn.speaker}: </span>
                  {editingIndex === index ? (
                    <div className="mt-1 flex gap-2">
                      <input 
                        autoFocus
                        className="bg-slate-800 text-white border border-blue-500/50 rounded px-2 py-1 w-full outline-none focus:ring-1 focus:ring-blue-500"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditSave(index);
                          if (e.key === 'Escape') setEditingIndex(null);
                        }}
                      />
                      <button 
                        onClick={() => handleEditSave(index)}
                        className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700 font-bold"
                      >
                        SAVE
                      </button>
                    </div>
                  ) : (
                    <span 
                        className="text-slate-300 cursor-text hover:bg-slate-800/50 rounded px-1 -mx-1 transition-colors"
                        onClick={() => handleEditStart(index, turn.text)}
                    >
                        {turn.text}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {displayText && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-4"
            >
              <span className="invisible w-14 shrink-0"></span>
              <p className="text-blue-400 italic">
                {displayText}
                <span className="inline-block w-1.5 h-4 ml-1 bg-blue-500 animate-pulse align-middle" />
              </p>
            </motion.div>
          )}

          {isRecording && turns.length === 0 && !displayText && (
            <div className="flex items-center justify-center h-full min-h-[150px]">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    animate={{ height: [8, 24, 8] }}
                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                    className="w-1 bg-blue-500/50 rounded-full"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
