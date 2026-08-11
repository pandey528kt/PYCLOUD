import React, { useState } from 'react';
import { Share2, Copy, Check, Lock, Globe, Shield, X, ExternalLink } from 'lucide-react';
import { Card3D } from './3d/Card3D';
import { Project, ProjectPrivacy } from '../types';

interface ShareModalProps {
  project: Project;
  onClose: () => void;
  onTogglePrivacy: (projectId: string, currentPrivacy: ProjectPrivacy) => Promise<void>;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  project,
  onClose,
  onTogglePrivacy,
}) => {
  const [copied, setCopied] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Generate share URL
  const shareUrl = `${window.location.origin}${window.location.pathname}?project=${project.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrivacySwitch = async (newPrivacy: ProjectPrivacy) => {
    if (newPrivacy === project.privacy) return;
    setIsUpdating(true);
    try {
      await onTogglePrivacy(project.id, project.privacy);
    } catch (err) {
      console.error('Error toggling privacy:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  const isShared = project.privacy === 'shared' || project.isShared;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]/85 backdrop-blur-md p-4">
      <Card3D className="w-full max-w-lg p-6 space-y-6" hoverEffect={false}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-950 border border-indigo-800 text-indigo-400">
              <Share2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Share Project Code</h2>
              <p className="text-xs text-gray-400">
                Grant access to view and copy code securely with share links.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Privacy Selector */}
        <div className="space-y-3">
          <label className="block text-xs font-semibold text-gray-300">
            Access Control
          </label>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handlePrivacySwitch('private')}
              disabled={isUpdating}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                !isShared
                  ? 'border-blue-500 bg-blue-950/40 text-blue-300 shadow-md'
                  : 'border-white/10 bg-[#050505] text-gray-400 hover:border-white/20'
              }`}
            >
              <Lock className="h-5 w-5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-gray-200">Private Only</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Only you can access</p>
              </div>
            </button>

            <button
              onClick={() => handlePrivacySwitch('shared')}
              disabled={isUpdating}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                isShared
                  ? 'border-indigo-500 bg-indigo-950/40 text-indigo-300 shadow-md'
                  : 'border-white/10 bg-[#050505] text-gray-400 hover:border-white/20'
              }`}
            >
              <Globe className="h-5 w-5 shrink-0" />
              <div>
                <p className="text-xs font-bold text-gray-200">Shared via Link</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Anyone with link can view</p>
              </div>
            </button>
          </div>
        </div>

        {/* Share Link Box */}
        {isShared ? (
          <div className="space-y-2 bg-[#050505] p-4 rounded-xl border border-white/10">
            <label className="block text-[11px] font-mono text-gray-400">
              Shareable Direct Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full rounded-lg border border-white/10 bg-[#0a0a0d] px-3 py-2 text-xs font-mono text-gray-300 select-all focus:outline-none"
              />
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 rounded-xl border border-blue-400/30 bg-gradient-to-r from-blue-600 to-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:brightness-110 shrink-0 shadow transition-all"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5 text-[11px] text-blue-400">
              <Shield className="h-3.5 w-3.5 shrink-0" />
              <span>
                Shared users can view, run and copy your code, but cannot edit or delete your original script.
              </span>
            </div>
          </div>
        ) : (
          <div className="bg-[#050505] p-4 rounded-xl border border-white/5 text-xs text-gray-400 text-center">
            <Lock className="h-6 w-6 text-gray-500 mx-auto mb-2" />
            <p className="font-semibold text-gray-300">Project is currently Private</p>
            <p className="text-[11px] text-gray-400 mt-1">
              Switch access control above to "Shared via Link" to generate a shareable URL.
            </p>
          </div>
        )}

        <div className="flex justify-end pt-2 border-t border-white/10">
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-[#0a0a0d] px-4 py-2 text-xs font-medium text-gray-300 hover:bg-[#121218]"
          >
            Done
          </button>
        </div>
      </Card3D>
    </div>
  );
};
