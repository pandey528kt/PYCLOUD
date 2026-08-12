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
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#0d0f17] px-4 py-3 shadow-[0_6px_20px_rgba(0,0,0,0.85)]">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        
        {/* Brand & Logo */}
        <div className="flex items-center gap-6">
          <div
            onClick={() => setActiveTab('dashboard')}
            className="flex cursor-pointer items-center gap-3 group"
          >
            <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/40 bg-gradient-to-b from-[#212636] to-[#121520] shadow-[0_4px_12px_rgba(0,0,0,0.6),_inset_0_1px_0_rgba(255,255,255,0.15)] group-hover:border-amber-400 transition-all duration-200">
              <Code2 className="h-5 w-5 text-amber-400 group-hover:scale-105 transition-transform" />
              <div className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-extrabold tracking-tight text-white text-lg font-sans">
                PyCloud <span className="text-amber-300 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 font-mono font-bold shadow-sm">3D</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase font-semibold">PYTHON IDE</p>
            </div>
          </div>

          {/* Cloud Sync Status */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border border-slate-800 bg-[#131622] text-xs shadow-inner">
            {isCloudSynced ? (
              <>
                <CloudCheck className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-[11px] font-mono text-slate-300">Cloud Synced</span>
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
        <nav className="flex items-center gap-1 rounded-xl border border-slate-800 bg-[#080a10] p-1 shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
              activeTab === 'dashboard'
                ? 'btn-3d-gold text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <LayoutDashboard className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('editor')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
              activeTab === 'editor'
                ? 'btn-3d-gold text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Code2 className="h-3.5 w-3.5" />
            <span>Workspace</span>
            {hasActiveProject && activeProjectTitle && (
              <span className="hidden lg:inline max-w-[100px] truncate text-[10px] bg-[#07090e] px-1.5 py-0.5 rounded text-amber-300 font-mono border border-slate-800">
                {activeProjectTitle}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('docs')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
              activeTab === 'docs'
                ? 'btn-3d-gold text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Docs</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all ${
              activeTab === 'settings'
                ? 'btn-3d-gold text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
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
            className="hidden sm:flex items-center gap-1.5 btn-3d-gold rounded-xl px-4 py-2 text-xs font-extrabold text-white"
          >
            <Plus className="h-4 w-4" />
            <span>New Script</span>
          </button>

          {user ? (
            <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
              <div
                onClick={() => setActiveTab('settings')}
                className="flex cursor-pointer items-center gap-2 rounded-xl p-1 hover:bg-white/5 transition-colors"
                title={user.email || 'User Account'}
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#181d2b] border border-amber-500/40 text-xs font-bold text-amber-300 shadow-md">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    user.displayName?.charAt(0).toUpperCase() || 'P'
                  )}
                </div>
                <div className="hidden xl:block text-left">
                  <p className="text-xs font-bold text-slate-200 leading-tight">
                    {user.displayName}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate max-w-[110px]">
                    {user.isAnonymous ? 'Guest User' : user.email}
                  </p>
                </div>
              </div>

              <button
                onClick={onLogout}
                className="rounded-xl p-2 text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1.5 btn-3d-dark rounded-xl px-3.5 py-1.5 text-xs font-bold text-slate-200"
            >
              <LogIn className="h-3.5 w-3.5 text-amber-400" />
              <span>Sign In</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};

