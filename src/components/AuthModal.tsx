import React, { useState } from 'react';
import { LogIn, UserPlus, Sparkles, X, Mail, Lock, User as UserIcon, AlertCircle } from 'lucide-react';
import { Card3D } from './3d/Card3D';
import { loginWithEmail, signupWithEmail, loginWithGoogle, loginAsGuest } from '../lib/firebase';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        await signupWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err?.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      setError(err?.message || 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestAuth = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginAsGuest();
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Guest Auth Error:', err);
      setError(err?.message || 'Guest sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07090e]/90 p-4">
      <Card3D className="w-full max-w-md p-6 space-y-6" hoverEffect={false}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#161a28] border border-amber-500/40 text-amber-400 shadow-md">
              <LogIn className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">
                {isSignUp ? 'Create Cloud Workspace' : 'Welcome Back'}
              </h2>
              <p className="text-xs text-slate-400">
                {isSignUp ? 'Sign up to sync Python projects across devices' : 'Sign in to access your saved Python code'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="rounded-xl border border-red-900/80 bg-red-950/80 p-3 space-y-2">
            <div className="flex items-start gap-2.5 text-xs text-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
            {(error.includes('authorized') || error.includes('domain') || error.includes('disabled') || error.includes('console')) && (
              <button
                type="button"
                onClick={handleGuestAuth}
                className="w-full flex items-center justify-center gap-1.5 btn-3d-slate py-2 text-xs font-bold text-white mt-1 shadow-md"
              >
                <UserIcon className="h-4 w-4" />
                <span>Continue instantly as Guest Pythonist</span>
              </button>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="email"
                required
                placeholder="developer@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full input-3d rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 font-sans"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full input-3d rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-600 font-sans"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 btn-3d-gold py-2.5 text-xs font-extrabold text-white disabled:opacity-50"
          >
            {loading ? 'Processing...' : isSignUp ? 'Create Free Account' : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-800" />
          </div>
          <span className="relative bg-[#131622] px-3 text-[10px] uppercase font-mono font-bold text-slate-500">
            or continue with
          </span>
        </div>

        {/* Social / Guest Options */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleGoogleAuth}
            disabled={loading}
            className="flex items-center justify-center gap-2 btn-3d-dark px-3 py-2 text-xs font-bold text-slate-200"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 9 5 12 5z"
              />
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
              />
              <path
                fill="#FBBC05"
                d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15s.7 5.3 1.9 7.7l3.7-2.9c-.6-1.5-1-3.2-1-5z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.3-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
              />
            </svg>
            <span>Google</span>
          </button>

          <button
            onClick={handleGuestAuth}
            disabled={loading}
            className="flex items-center justify-center gap-2 btn-3d-dark px-3 py-2 text-xs font-bold text-slate-200"
          >
            <UserIcon className="h-4 w-4 text-amber-400" />
            <span>Guest Demo</span>
          </button>
        </div>

        {/* Toggle Mode */}
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="text-xs font-bold text-slate-400 hover:text-amber-400 transition-colors"
          >
            {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up free"}
          </button>
        </div>
      </Card3D>
    </div>
  );
};
