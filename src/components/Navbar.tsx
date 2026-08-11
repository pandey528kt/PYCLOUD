import React from 'react';
import {
  Code2,
  LayoutDashboard,
  Settings,
  BookOpen,
  Plus,
  CloudCheck,
  Cloud,
  User as UserIcon,
  LogOut,
  LogIn,
  Sparkles,
} from 'lucide-react';
import { UserProfile } from '../types';

interface NavbarProps {
  activeTab: 'dashboard' | 'editor' | 'docs' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'editor' | 'docs' | 'settings') => void;
  user: UserProfile | null;
  onOpenAuth: () => void;
  onLogout: () => void;
  onNewProject: () => void;
  hasActiveProject: boolean;
  activeProjectTitle?: string;
  isCloudSynced?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  user,
  onOpenAuth,
  onLogout,
  onNewProject,
  hasActiveProject,
  activeProjectTitle,
  isCloudSynced = true,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-[#050505]/90 backdrop-blur-md px-4 py-2.5 shadow-[0_4px_25px_rgba(0,0,0,0.9)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        
        {/* Brand & Logo */}
        <div className="flex items-center gap-6">
          <div
            onClick={() => setActiveTab('dashboard')}
            className="flex cursor-pointer items-center gap-3 group"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-950 via-[#0a0a10] to-[#050505] shadow-[0_4px_16px_rgba(59,130,246,0.25)] group-hover:border-blue-400 group-hover:shadow-[0_6px_22px_rgba(59,130,246,0.4)] transition-all duration-300">
              <Code2 className="h-5 w-5 text-blue-400 group-hover:scale-110 transition-transform" />
              <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-bold tracking-tight text-white text-lg">
                PyCloud <span className="text-blue-400 text-[10px] px-1.5 py-0.5 rounded bg-blue-950/80 border border-blue-800/60 font-mono">3D</span>
              </div>
              <p className="text-[10px] text-gray-400 font-mono tracking-wider">PYTHON WORKSPACE</p>
            </div>
          </div>

          {/* Cloud Sync Status */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full border border-white/5 bg-[#0a0a0d] text-xs text-gray-400">
            {isCloudSynced ? (
              <>
                <CloudCheck className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-[11px] font-mono text-gray-300">Cloud Connected</span>
              </>
            ) : (
              <>
                <Cloud className="h-3.5 w-3.5 text-amber-400 animate-spin" />
                <span className="text-[11px] font-mono text-amber-300">Syncing...</span>
              </>
            )}
          </div>
        </div>

        {/* Center Nav Links */}
        <nav className="flex items-center gap-1 rounded-xl border border-white/5 bg-[#08080a] p-1 shadow-inner">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_2px_10px_rgba(37,99,235,0.4)] border border-blue-400/30'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('editor')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'editor'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_2px_10px_rgba(37,99,235,0.4)] border border-blue-400/30'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            <span>Workspace</span>
            {hasActiveProject && activeProjectTitle && (
              <span className="hidden lg:inline max-w-[100px] truncate text-[10px] bg-[#050505] px-1.5 py-0.5 rounded text-blue-300 font-mono border border-white/5">
                {activeProjectTitle}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('docs')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'docs'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_2px_10px_rgba(37,99,235,0.4)] border border-blue-400/30'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">GitHub Pages</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'settings'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-[0_2px_10px_rgba(37,99,235,0.4)] border border-blue-400/30'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <Settings className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Settings</span>
          </button>
        </nav>

        {/* Right Actions & User Profile */}
        <div className="flex items-center gap-3">
          <button
            onClick={onNewProject}
            className="hidden sm:flex items-center gap-1.5 rounded-xl border border-blue-400/30 bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 px-3.5 py-1.5 text-xs font-semibold text-white shadow-[0_4px_15px_rgba(37,99,235,0.35)] hover:brightness-110 active:scale-95 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Code</span>
          </button>

          {user ? (
            <div className="flex items-center gap-2 border-l border-white/5 pl-3">
              <div
                onClick={() => setActiveTab('settings')}
                className="flex cursor-pointer items-center gap-2 rounded-xl p-1 hover:bg-white/5 transition-colors"
                title={user.email || 'User Account'}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-blue-900 to-[#08080a] border border-blue-500/40 text-xs font-bold text-blue-300 shadow">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    user.displayName?.charAt(0).toUpperCase() || 'P'
                  )}
                </div>
                <div className="hidden xl:block text-left">
                  <p className="text-xs font-semibold text-gray-200 leading-tight">
                    {user.displayName}
                  </p>
                  <p className="text-[10px] text-gray-400 truncate max-w-[110px]">
                    {user.isAnonymous ? 'Guest User' : user.email}
                  </p>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="rounded-xl p-2 text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#0a0a0d] px-3.5 py-1.5 text-xs font-medium text-gray-200 hover:bg-[#121218] hover:border-white/20 transition-all shadow"
            >
              <LogIn className="h-3.5 w-3.5 text-blue-400" />
              <span>Sign In / Register</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
