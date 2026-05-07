import React from 'react';
import { motion } from 'motion/react';
import type { AppMode } from './App';
import type { User, Permission, AIProviderSettings } from './types';
import { Stethoscope, Settings, UserCircle, LogOut, Languages, Sun, Moon } from 'lucide-react';
import { APP_NAME } from './constants/appConfig';
import { t } from './utils/i18n';

interface HeaderProps {
    onSettingsClick: () => void;
    onUserSwitcherClick: () => void;
    appMode: AppMode;
    onModeChange: (mode: AppMode) => void;
    currentUser: User | null;
    onLogout: () => void;
    hasPermission: (p: Permission) => boolean;
    aiProviderSettings: AIProviderSettings;
    onLanguageChange?: (lang: string) => void;
    theme: 'light' | 'dark';
    onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
    onSettingsClick, 
    onUserSwitcherClick, 
    appMode, 
    onModeChange, 
    currentUser, 
    onLogout, 
    hasPermission,
    aiProviderSettings,
    onLanguageChange,
    theme,
    onToggleTheme
}) => {
  const lang = aiProviderSettings.preferredLanguage || 'English';

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/80">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-bold text-white shadow-lg shadow-blue-200 dark:shadow-none">
              <Stethoscope size={24} />
            </div>
            <h1 className="hidden text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:block">
              {APP_NAME}
            </h1>
          </motion.div>

          <div className="flex items-center gap-2 sm:gap-6">
            <div className="flex items-center rounded-full bg-slate-100 p-1 dark:bg-slate-900 shadow-inner">
              <button
                onClick={() => onModeChange('patient-booking')}
                className={`relative rounded-full px-2 xs:px-4 py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                  appMode === 'patient-booking' 
                    ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400' 
                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
              >
                <span className="xs:inline hidden">{t('patient_view', lang)}</span>
                <span className="xs:hidden">Patient</span>
              </button>
              {hasPermission('viewDashboard') && (
                <button
                  onClick={() => onModeChange('clinic-admin')}
                  className={`relative rounded-full px-2 xs:px-4 py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-200 ${
                    appMode === 'clinic-admin' 
                      ? 'bg-white text-blue-600 shadow-sm dark:bg-slate-800 dark:text-blue-400' 
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                }`}
                >
                  <span className="xs:inline hidden">{t('clinic_view', lang)}</span>
                  <span className="xs:hidden">Clinic</span>
                </button>
              )}
            </div>

            {currentUser && (
              <div className="flex items-center gap-4 border-l border-slate-200 pl-6 dark:border-slate-800">
                <div className="hidden items-center gap-2 sm:flex">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                    <UserCircle size={18} />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {currentUser.name}
                    </span>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={onLogout}
                        className="group flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <LogOut size={10} />
                        {t('sign_out', lang)}
                      </button>
                      <button 
                        onClick={onUserSwitcherClick}
                        className="group flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-blue-400 hover:text-blue-600 transition-colors"
                      >
                        <UserCircle size={10} />
                        {t('switch', lang)}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 border-l border-slate-200 pl-4 dark:border-slate-800">
                  <div className="flex items-center gap-1 overflow-hidden rounded-md bg-slate-100 dark:bg-slate-900 px-2 py-1">
                    <Languages size={14} className="text-slate-400" />
                    <select 
                      value={lang} 
                      onChange={(e) => onLanguageChange?.(e.target.value)}
                      className="bg-transparent text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 outline-none cursor-pointer"
                    >
                      <option value="English">EN</option>
                      <option value="Spanish">ES</option>
                      <option value="French">FR</option>
                      <option value="Swahili">SW</option>
                      <option value="Hindi">HI</option>
                    </select>
                  </div>

                  <button
                    onClick={onToggleTheme}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white transition-all focus:outline-none"
                    title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
                  >
                    {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                  </button>

                  <button
                    onClick={onSettingsClick}
                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white transition-all"
                    title={t('settings', lang)}
                  >
                    <Settings size={20} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
