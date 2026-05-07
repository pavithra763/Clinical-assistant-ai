import React, { useState } from 'react';
import type { User } from '../types';
import { StethoscopeIcon, MailIcon } from '../constants/icons';
import { APP_NAME } from '../constants/appConfig';

interface LoginScreenProps {
    // FIX: Changed onLogin to accept a Promise to handle asynchronous login operations.
    onLogin: (username: string, password: string) => Promise<User | null>;
    onCheckUserExists: (username: string) => boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onCheckUserExists }) => {
    const [view, setView] = useState<'login' | 'reset' | 'success'>('login');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [resetUsername, setResetUsername] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleLoginAttempt = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);
        const user = await onLogin(username, password);
        if (!user) {
            setError('Invalid username or password. Please try again.');
        }
        setIsLoading(false);
    };

    const handlePasswordReset = (e: React.FormEvent) => {
        e.preventDefault();
        const userExists = onCheckUserExists(resetUsername);
        // Simulate sending an email. For security, we don't confirm if the user exists.
        console.log(`Password reset requested for user: "${resetUsername}". User found: ${userExists}`);
        if (userExists) {
            console.log("SIMULATING: Sending password reset email.");
        }
        setView('success');
    };
    
    const renderLoginView = () => (
        <>
            <div className="text-center">
                <StethoscopeIcon className="w-12 h-12 mx-auto text-blue-600 dark:text-blue-500"/>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-4">{APP_NAME} Login</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Sign in to access the dashboard.</p>
            </div>
            <form onSubmit={handleLoginAttempt} className="space-y-6">
                <div>
                    <label htmlFor="username" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Username</label>
                    <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm" placeholder="e.g., Admin User" required autoFocus disabled={isLoading} />
                </div>
                <div>
                    <div className="flex justify-between">
                        <label htmlFor="password"className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
                        <button type="button" onClick={() => setView('reset')} className="text-sm text-blue-600 hover:underline dark:text-blue-400" disabled={isLoading}>Forgot Password?</button>
                    </div>
                    <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm" placeholder="Default: admin" required disabled={isLoading} />
                </div>
                {error && (<p className="text-sm text-red-600 dark:text-red-400">{error}</p>)}
                <div>
                    <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 disabled:opacity-50" disabled={isLoading}>
                        {isLoading ? 'Signing In...' : 'Sign In'}
                    </button>
                </div>
            </form>
        </>
    );

    const renderResetView = () => (
         <>
            <div className="text-center">
                <MailIcon className="w-12 h-12 mx-auto text-blue-600 dark:text-blue-500"/>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-4">Reset Password</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-1">Enter your username to receive a reset link.</p>
            </div>
            <form onSubmit={handlePasswordReset} className="space-y-6">
                <div>
                    <label htmlFor="reset-username" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Username</label>
                    <input id="reset-username" type="text" value={resetUsername} onChange={(e) => setResetUsername(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm" placeholder="Enter your username" required autoFocus/>
                </div>
                <div>
                    <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800">Send Reset Link</button>
                </div>
                <div className="text-center">
                    <button type="button" onClick={() => setView('login')} className="text-sm text-blue-600 hover:underline dark:text-blue-400">Back to Login</button>
                </div>
            </form>
        </>
    );
    
    const renderSuccessView = () => (
        <div className="text-center">
            <MailIcon className="w-12 h-12 mx-auto text-green-500"/>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mt-4">Check Your Email</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">If an account exists for that user, a password reset link has been sent to their registered email address.</p>
            <button onClick={() => setView('login')} className="mt-6 w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800">
                Back to Login
            </button>
        </div>
    );

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 font-sans p-4">
            <div className="w-full max-w-md">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 space-y-6">
                    {view === 'login' && renderLoginView()}
                    {view === 'reset' && renderResetView()}
                    {view === 'success' && renderSuccessView()}
                </div>
                 {view === 'login' && (
                    <div className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
                        <p>This is a simulated login screen.</p>
                        <p>Default credentials: <code className="bg-slate-200 dark:bg-slate-600 px-1 py-0.5 rounded">Admin User</code> / <code className="bg-slate-200 dark:bg-slate-600 px-1 py-0.5 rounded">admin</code></p>
                    </div>
                )}
            </div>
        </div>
    );
};
