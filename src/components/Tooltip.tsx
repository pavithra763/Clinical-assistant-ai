import React from 'react';

interface TooltipProps {
  text: string;
  children: React.ReactElement;
  position?: 'top' | 'bottom';
}

export const Tooltip: React.FC<TooltipProps> = ({ text, children, position = 'bottom' }) => {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  };
  
  // The 'group' class on the container allows the tooltip span to react to the hover state of the container.
  return (
    <div className="relative group">
      {children}
      <span 
        role="tooltip"
        // Base classes for the tooltip bubble
        className={`absolute z-10 w-max max-w-xs p-2 text-center text-sm text-white dark:text-slate-100 bg-slate-800 dark:bg-slate-700 rounded-md shadow-lg
                   
                   // Visibility handled by group-hover
                   opacity-0 group-hover:opacity-100 transition-opacity duration-300
                   
                   // Prevent the tooltip from capturing mouse events
                   pointer-events-none
                   
                   // Positioning classes
                   ${positionClasses[position]}`}
      >
        {text}
      </span>
    </div>
  );
};