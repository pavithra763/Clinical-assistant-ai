import React from 'react';

export type Tab<T extends string> = {
    id: T;
    label: string;
    icon?: React.ReactNode;
};

interface TabsProps<T extends string> {
    tabs: Tab<T>[];
    activeTab: T;
    onTabChange: (tabId: T) => void;
}

export const Tabs = <T extends string>({ tabs, activeTab, onTabChange }: TabsProps<T>) => {
    return (
        <div className="mb-8 border-b border-slate-200 dark:border-slate-700">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`
                            whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-md transition-colors
                            ${
                                activeTab === tab.id
                                ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:border-slate-500'
                            }
                        `}
                        aria-current={activeTab === tab.id ? 'page' : undefined}
                    >
                        <span className="flex items-center gap-2">
                           {tab.icon}
                           {tab.label}
                        </span>
                    </button>
                ))}
            </nav>
        </div>
    );
};