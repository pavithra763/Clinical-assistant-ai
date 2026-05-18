import React, { useState, useEffect } from 'react';
import type { User, Role, Permission } from '../types';
import { ALL_PERMISSIONS } from '../constants/permissions';
import { ErrorFeedback } from './ErrorFeedback';

interface RBACScreenProps {
    users: User[];
    roles: Role[];
    onSave: (roles: Role[], users: User[]) => void;
    onBack: () => void;
}

const PlusIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" /></svg>;
const TrashIcon: React.FC<{ className?: string }> = ({ className }) => <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" /></svg>;

const permissionCategories = Array.from(new Set(ALL_PERMISSIONS.map(p => p.category)));

export const RBACScreen: React.FC<RBACScreenProps> = ({ users, roles, onSave, onBack }) => {
    const [localUsers, setLocalUsers] = useState<User[]>(users);
    const [localRoles, setLocalRoles] = useState<Role[]>(roles);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [newUserName, setNewUserName] = useState('');
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserRole, setNewUserRole] = useState<string>('');
    const [newUserPassword, setNewUserPassword] = useState('');

    useEffect(() => {
        // setLocalUsers(users);
        fetchUsers();
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_BASE_URL}/roles/`,
                {
                    method: "GET",
                    headers: {
                        accept: "application/json",
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Failed to fetch roles");
            }

            const data = await response.json();

            console.log("Fetch roles--", data);
            setLocalRoles(data);

        } catch (error) {
            console.error(error);
            setError("Error fetching roles");
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_BASE_URL}/users/`,
                {
                    method: "GET",
                    headers: {
                        accept: "application/json",
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Failed to fetch users");
            }

            const data = await response.json();

            console.log("Fetch users--", data);
            setLocalUsers(data);

        } catch (error) {
            console.error(error);
            setError("Error fetching users");
        }
    };

    // const handleAddUser = () => {
    //     setError(null);
    //     if (!newUserName.trim() || !newUserRole) {
    //         setError("Please enter a name and select a role.");
    //         return;
    //     }
    //     const newUser: User = {
    //         id: `user-${Date.now()}`,
    //         name: newUserName,
    //         roleId: newUserRole,
    //         email: newUserEmail,
    //     };
    //     setLocalUsers(prev => [...prev, newUser]);
    //     setNewUserName('');
    //     setNewUserEmail('');
    // };

    const handleAddUser = async () => {
        setError(null);
        console.log("selected role id", newUserRole);

        if (!newUserName.trim() || !newUserRole) {
            setError("Please enter a name and select a role.");
            return;
        }

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_BASE_URL}/users/`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        accept: "application/json",
                    },
                    body: JSON.stringify({
                        name: newUserName,
                        role_id: newUserRole,
                        email: newUserEmail,
                        password: newUserPassword
                    }),
                }
            );

            if (!response.ok) {
                throw new Error("Failed to create user");
            }

            const savedUser = await response.json();

            const newUser: User = {
                id: savedUser.id,
                name: savedUser.name,
                roleId: savedUser.role_id,
                email: savedUser.email,
            };

            setLocalUsers((prev) => [...prev, newUser]);

            setNewUserName("");
            setNewUserEmail("");

        } catch (error) {
            console.error(error);
            setError("Error creating user");
        }
    };

    const handleRemoveUser = async (userId: string) => {
        setError(null);

        if (localUsers.length <= 1) {
            setError("You cannot remove the last user.");
            return;
        }

        try {
            const response = await fetch(
                `${import.meta.env.VITE_API_BASE_URL}/users/${userId}`,
                {
                    method: "DELETE",
                    headers: {
                        accept: "*/*",
                    },
                }
            );

            if (!response.ok) {
                throw new Error("Failed to delete user");
            }

            setLocalUsers((prev) => prev.filter((u) => u.id !== userId));

        } catch (error) {
            console.error(error);
            setError("Error deleting user");
        }
    };

    const handlePermissionChange = (roleId: string, permission: Permission, checked: boolean) => {
        setLocalRoles(prevRoles => prevRoles.map(role => {
            if (role.id === roleId) {
                const newPermissions = new Set(role.permissions);
                if (checked) {
                    newPermissions.add(permission);
                } else {
                    newPermissions.delete(permission);
                }
                return { ...role, permissions: newPermissions };
            }
            return role;
        }));
    };

    const handleSaveChanges = () => {
        onSave(localRoles, localUsers);
        setSuccessMessage("Changes saved successfully!");
        setTimeout(() => setSuccessMessage(null), 3000);
    };

    const sortedRoles = [...localRoles].sort((a, b) => a.name.localeCompare(b.name));

    return (
        <div className="max-w-7xl mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-6 md:p-8 space-y-8 animate-fade-in text-slate-900 dark:text-slate-100">
            <ErrorFeedback message={error} onDismiss={() => setError(null)} />
            {successMessage && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 dark:bg-green-900/20 dark:border-green-900/50 dark:text-green-300">
                    {successMessage}
                </div>
            )}
            <div className="flex justify-between items-center">
                <h2 className="text-xl md:text-2xl font-bold text-slate-700 dark:text-slate-300">Manage Users & Roles</h2>
                <button onClick={onBack} className="text-sm bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600">
                    Back to Dashboard
                </button>
            </div>

            {/* User Management */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b dark:border-slate-600 pb-2">Clinic Staff</h3>
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div>
                            <label htmlFor="user-name" className="block text-sm font-medium text-slate-600 dark:text-slate-300">User's Name</label>
                            <input id="user-name" type="text" value={newUserName} onChange={e => setNewUserName(e.target.value)} className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800" placeholder="e.g., Dr. John Smith" />
                        </div>
                        <div>
                            <label htmlFor="user-email" className="block text-sm font-medium text-slate-600 dark:text-slate-300">Email (Optional)</label>
                            <input id="user-email" type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800" placeholder="e.g., j.smith@clinic.com" />
                        </div>
                        <div>
                            <label htmlFor="user-role" className="block text-sm font-medium text-slate-600 dark:text-slate-300">Assign Role</label>
                            <select id="user-role" value={newUserRole} onChange={e => setNewUserRole(e.target.value)} className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800">
                                {sortedRoles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label
                                htmlFor="user-password"
                                className="block text-sm font-medium text-slate-600 dark:text-slate-300"
                            >
                                Password
                            </label>

                            <input
                                id="user-password"
                                type="password"
                                value={newUserPassword}
                                onChange={(e) => setNewUserPassword(e.target.value)}
                                className="mt-1 w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800"
                                placeholder="Enter password"
                            />
                        </div>
                        <button onClick={handleAddUser} className="bg-blue-100 text-blue-700 font-semibold py-2 px-4 rounded-lg hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900 flex items-center justify-center gap-1">
                            <PlusIcon className="w-5 h-5" /> Add User
                        </button>
                    </div>
                </div>
                <ul className="space-y-2">
                    {localUsers.map(user => {
                        const role = localRoles.find(r => r.id === user.role_id);
                        return (
                            <li key={user.id} className="flex items-center justify-between p-3 rounded-md bg-white dark:bg-slate-700/50 border border-slate-200 dark:border-slate-700">
                                <div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200">{user.name}</p>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        {role?.name || 'No Role'}
                                        {user.email && ` • ${user.email}`}
                                    </p>
                                </div>
                                {role?.name !== 'Admin' && (
                                    <button onClick={() => handleRemoveUser(user.id)} className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-500 p-2 rounded-full"><TrashIcon className="w-5 h-5" /></button>
                                )}
                            </li>
                        )
                    })}
                </ul>
            </section>

            {/* Permissions Matrix */}
            <section className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 border-b dark:border-slate-600 pb-2">Role Permissions</h3>
                <div className="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                        <thead className="bg-slate-50 dark:bg-slate-900/40">
                            <tr>
                                <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-200 sm:pl-6">Permission</th>
                                {sortedRoles.map(role => (
                                    <th key={role.id} scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-slate-900 dark:text-slate-200">{role.name}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-600 bg-white dark:bg-slate-800">
                            {permissionCategories.map(category => (
                                <React.Fragment key={category}>
                                    <tr>
                                        <td colSpan={roles.length + 1} className="whitespace-nowrap px-3 py-3 text-sm font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-700/50">
                                            {category}
                                        </td>
                                    </tr>
                                    {ALL_PERMISSIONS.filter(p => p.category === category).map(permission => (
                                        <tr key={permission.id}>
                                            <td className="py-4 pl-4 pr-3 text-sm sm:pl-6">
                                                <div className="font-medium text-slate-900 dark:text-slate-200">{permission.id.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</div>
                                                <div className="mt-1 text-slate-500 dark:text-slate-400">{permission.description}</div>
                                            </td>
                                            {sortedRoles.map(role => (
                                                <td key={`${role.id}-${permission.id}`} className="whitespace-nowrap px-3 py-4 text-sm text-slate-500 text-center">
                                                    <input
                                                        type="checkbox"
                                                        className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                        checked={!!role.permissions[permission.id]}
                                                        onChange={(e) => handlePermissionChange(role.id, permission.id, e.target.checked)}
                                                        disabled={role.name === 'Admin'}
                                                    />
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            <div className="flex justify-end items-center pt-4 border-t border-slate-200 dark:border-slate-700">
                <button onClick={handleSaveChanges} className="bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 transition-colors shadow-md">
                    Save All Changes
                </button>
            </div>
        </div>
    );
};