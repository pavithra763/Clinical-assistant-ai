import React, { useEffect, useState } from 'react';
import { AlertIcon, CloseIcon } from '../constants/icons';

interface ErrorBannerProps {
  message: string;
  onDismiss: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ message, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  // Animate in
  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    // Allow animation to complete before calling onDismiss
    setTimeout(onDismiss, 300); 
  };

  return (
    <div 
      role="alert" 
      className={`fixed top-0 left-0 right-0 z-50 transform transition-all duration-300 ease-in-out ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}
    >
      <div className="container mx-auto px-4 md:px-8 pt-4">
        <div className="bg-red-600 text-white p-4 rounded-lg shadow-2xl flex items-center justify-between">
          <div className="flex items-center">
            <AlertIcon className="h-6 w-6 mr-3 flex-shrink-0" />
            <p>
              <span className="font-bold mr-2">Error:</span>
              {message}
            </p>
          </div>
          <button 
            onClick={handleDismiss} 
            aria-label="Dismiss"
            className="p-1 rounded-full hover:bg-red-500 transition-colors"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};