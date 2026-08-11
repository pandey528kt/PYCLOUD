import React, { useState } from 'react';
import {
  User as UserIcon,
  Key,
  Shield,
  Trash2,
  LogOut,
  Moon,
  Database,
  Check,
  AlertCircle,
  Save,
  Info,
  Lock,
} from 'lucide-react';
import { Card3D } from './3d/Card3D';
import { UserProfile } from '../types';
import { updateUserPassword, deleteAccount } from '../lib/firebase';
import defaultConfig from '../../firebase-applet-config.json';

interface SettingsPageProps {
  user: UserProfile | null;
  onLogout: () => void;
  onOpenAuth: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ user, onLogout, onOpenAuth }) => {
  const [newPassword, setNewPassword] = useState('');
  const [passMessage, setPassMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [isChangingPass, setIsChangingPass] = useState(false);

  // Custom Firebase Config State
  const [customConfigText, setCustomConfigText] = useState(() => {
    return localStorage.getItem('pycloud_custom_firebase_config') || '';
  });
  const [configSaved, setConfigSaved] = useState(false);

  // Delete Account State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setPassMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }

    setIsChangingPass(true);
    setPassMessage(null);

    try {
      await updateUserPassword(newPassword);
      setPassMessage({ type: 'success', text: 'Password updated successfully!' });
      setNewPassword('');
    } catch (err: any) {
      console.error('Password change failed:', err);
      setPassMessage({
        type: 'error',
        text: err?.message || 'Failed to update password. Please re-authenticate and try again.',
      });
    } finally {
      setIsChangingPass(false);
    }
  };

  const handleSaveCustomFirebaseConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customConfigText.trim()) {
      localStorage.removeItem('pycloud_custom_firebase_config');
    } else {
      try {
        JSON.parse(customConfigText);
        localStorage.setItem('pycloud_custom_firebase_config', customConfigText.trim());
      } catch (err) {
        alert('Invalid JSON config format.');
        return;
      }
    }
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 3000);
  };

  const handleDeleteAccountConfirm = async () => {
    setIsDeletingAccount(true);
    try {
      await deleteAccount();
      onLogout();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete account. You may need to sign out and log in again.');
    } finally {
      setIsDeletingAccount(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      
      {/* Title */}
      <div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          Account & Workspace Settings
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Manage your cloud account credentials, security options, and standalone Firebase deployment credentials.
        </p>
      </div>

      {/* User Profile Card */}
      <Card3D className="p-6 space-y-6" hoverEffect={false}>
        <div className="flex items-center gap-4 pb-6 border-b border-white/10">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-950 via-[#0a0a0d] to-[#050505] border border-blue-500/30 text-blue-400 text-2xl font-bold shadow-lg">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="h-16 w-16 rounded-2xl object-cover" />
            ) : (
              user?.displayName?.charAt(0).toUpperCase() || 'P'
            )}
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <h2 className="text-lg font-bold text-white">{user ? user.displayName : 'Guest User'}</h2>
            <p className="text-xs font-mono text-gray-400">
              {user ? (user.isAnonymous ? 'Anonymous Guest Session' : user.email) : 'Not Signed In'}
            </p>
            {user && (
              <span className="inline-block text-[10px] bg-blue-950/80 border border-blue-800/60 text-blue-300 font-mono px-2 py-0.5 rounded">
                UID: {user.uid}
              </span>
            )}
          </div>

          {!user ? (
            <button
              onClick={onOpenAuth}
              className="rounded-xl border border-blue-400/30 bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 px-4 py-2 text-xs font-semibold text-white shadow hover:brightness-110"
            >
              Sign In / Register
            </button>
          ) : (
            <button
              onClick={onLogout}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0a0a0d] px-4 py-2 text-xs font-medium text-gray-300 hover:text-red-400 hover:border-red-900 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          )}
        </div>

        {/* Change Password Form (if user is logged in with email) */}
        {user && !user.isAnonymous && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-bold text-gray-200">Change Password</h3>
            </div>

            {passMessage && (
              <div
                className={`flex items-center gap-2 rounded-xl p-3 text-xs border ${
                  passMessage.type === 'success'
                    ? 'border-blue-800 bg-blue-950/60 text-blue-300'
                    : 'border-red-800 bg-red-950/60 text-red-300'
                }`}
              >
                {passMessage.type === 'success' ? (
                  <Check className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{passMessage.text}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="flex flex-col sm:flex-row gap-3">
              <input
                type="password"
                placeholder="New Password (min 6 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="flex-1 rounded-xl border border-white/10 bg-[#050505] px-3.5 py-2 text-xs text-gray-200 focus:border-blue-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isChangingPass || !newPassword}
                className="rounded-xl border border-blue-400/30 bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow hover:brightness-110 disabled:opacity-50"
              >
                {isChangingPass ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        )}
      </Card3D>

      {/* Theme & Display Options */}
      <Card3D className="p-6 space-y-4" hoverEffect={false}>
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <Moon className="h-4 w-4 text-blue-400" />
          <h3 className="text-sm font-bold text-gray-200">Theme & UI Preference</h3>
        </div>
        <p className="text-xs text-gray-400">
          PyCloud Workspace features an Immersive 3D Dark theme with deep black accents, crisp white/5 borders, and gradient highlights optimized for readability.
        </p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-blue-500/50 bg-[#050505] px-4 py-2.5 text-xs text-blue-400 font-mono shadow">
            <Check className="h-4 w-4" />
            <span>Immersive 3D Charcoal (Active)</span>
          </div>
        </div>
      </Card3D>

      {/* Firebase Configuration Inspector for Standalone GitHub Pages */}
      <Card3D className="p-6 space-y-4" hoverEffect={false}>
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <Database className="h-4 w-4 text-blue-400" />
          <h3 className="text-sm font-bold text-gray-200">Standalone Firebase Config (For GitHub Pages)</h3>
        </div>

        <p className="text-xs text-gray-400 leading-relaxed">
          When deployed standalone on GitHub Pages, PyCloud Workspace connects to your active Firebase project. You can inspect or override the configuration JSON below.
        </p>

        <form onSubmit={handleSaveCustomFirebaseConfig} className="space-y-3">
          <div>
            <label className="block text-[11px] font-mono text-gray-400 mb-1">
              Active Config JSON (Leave empty to use built-in default):
            </label>
            <textarea
              rows={6}
              value={customConfigText || JSON.stringify(defaultConfig, null, 2)}
              onChange={(e) => setCustomConfigText(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#050505] p-3 font-mono text-xs text-gray-300 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('pycloud_custom_firebase_config');
                setCustomConfigText('');
                alert('Reset to default Firebase configuration!');
              }}
              className="text-xs text-gray-400 hover:text-gray-200"
            >
              Reset to Default
            </button>

            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-xl border border-blue-400/30 bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:brightness-110"
            >
              <Save className="h-3.5 w-3.5" />
              <span>{configSaved ? 'Saved to LocalStorage!' : 'Save Custom Config'}</span>
            </button>
          </div>
        </form>
      </Card3D>

      {/* Danger Zone */}
      {user && (
        <Card3D className="p-6 space-y-4 border-red-900/50" hoverEffect={false}>
          <div className="flex items-center gap-2 border-b border-white/10 pb-3 text-red-400">
            <Trash2 className="h-4 w-4" />
            <h3 className="text-sm font-bold">Danger Zone</h3>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-gray-200">Delete Account & Cloud Projects</p>
              <p className="text-[11px] text-gray-400">
                Permanently delete your account credentials.
              </p>
            </div>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-xl border border-red-500/40 bg-red-950/80 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-900/80 hover:text-white transition-all shadow"
            >
              Delete Account
            </button>
          </div>
        </Card3D>
      )}

      {/* Delete Account Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]/85 backdrop-blur-md p-4">
          <Card3D className="w-full max-w-md p-6 space-y-4 border-red-900/50" hoverEffect={false}>
            <h3 className="text-base font-bold text-red-400">Permanently Delete Account?</h3>
            <p className="text-xs text-gray-300 leading-relaxed">
              Are you sure you want to delete your account? This will remove your user authentication profile from Firebase.
            </p>
            <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-xl px-4 py-2 text-xs font-medium text-gray-400 hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccountConfirm}
                disabled={isDeletingAccount}
                className="rounded-xl border border-red-500/50 bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-red-500"
              >
                {isDeletingAccount ? 'Deleting...' : 'Confirm Account Deletion'}
              </button>
            </div>
          </Card3D>
        </div>
      )}

    </div>
  );
};
