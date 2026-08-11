import React, { useState, useEffect } from 'react';
import { History, RotateCcw, Clock, X, Check, Code, Shield } from 'lucide-react';
import { Card3D } from './3d/Card3D';
import { ProjectVersion } from '../types';
import { getProjectVersions } from '../lib/firebase';

interface VersionHistoryModalProps {
  projectId: string;
  currentCode: string;
  isOwner: boolean;
  onClose: () => void;
  onRestoreVersion: (versionCode: string) => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  projectId,
  currentCode,
  isOwner,
  onClose,
  onRestoreVersion,
}) => {
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<ProjectVersion | null>(null);

  useEffect(() => {
    let isMounted = true;
    getProjectVersions(projectId).then((list) => {
      if (isMounted) {
        setVersions(list);
        if (list.length > 0) {
          setSelectedVersion(list[0]);
        }
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [projectId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]/85 backdrop-blur-md p-4">
      <Card3D className="w-full max-w-4xl h-[80vh] flex flex-col p-6 overflow-hidden" hoverEffect={false}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-950 border border-blue-800 text-blue-400">
              <History className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Project Version History</h2>
              <p className="text-xs text-gray-400">
                Snapshots automatically saved on code updates. Select a version to preview and restore.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:text-white hover:bg-white/5">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body Content Split */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 py-4 min-h-0 overflow-hidden">
          {/* Left Versions Timeline List */}
          <div className="md:col-span-1 border-r border-white/5 pr-2 overflow-y-auto space-y-2">
            <p className="text-[11px] font-mono text-gray-400 uppercase tracking-wider mb-2">
              Saved Snapshots ({versions.length})
            </p>

            {loading ? (
              <div className="text-xs text-gray-400 py-8 text-center animate-pulse">
                Loading history...
              </div>
            ) : versions.length === 0 ? (
              <div className="text-xs text-gray-400 py-8 text-center bg-[#050505] rounded-xl border border-white/5 p-4">
                No previous snapshots found. Save major changes to build history.
              </div>
            ) : (
              versions.map((ver, idx) => (
                <div
                  key={ver.id}
                  onClick={() => setSelectedVersion(ver)}
                  className={`cursor-pointer rounded-xl border p-3 text-xs transition-all ${
                    selectedVersion?.id === ver.id
                      ? 'border-blue-500 bg-blue-950/40 text-blue-300 shadow-md'
                      : 'border-white/5 bg-[#050505] text-gray-400 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-gray-200">
                    <span>{ver.label || `Snapshot #${versions.length - idx}`}</span>
                    {idx === 0 && (
                      <span className="text-[9px] bg-blue-900 text-blue-300 px-1.5 py-0.5 rounded font-mono">
                        Latest
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-1">
                    <Clock className="h-3 w-3" />
                    <span>{new Date(ver.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Version Code Preview & Diff */}
          <div className="md:col-span-2 flex flex-col min-h-0 bg-[#050505] rounded-xl border border-white/10 overflow-hidden">
            {selectedVersion ? (
              <>
                <div className="flex items-center justify-between border-b border-white/5 bg-[#08080a] px-4 py-2 text-xs">
                  <div className="flex items-center gap-2 font-mono text-gray-300">
                    <Code className="h-4 w-4 text-blue-400" />
                    <span>{selectedVersion.label}</span>
                    <span className="text-gray-400">({selectedVersion.code.split('\n').length} lines)</span>
                  </div>

                  {isOwner && (
                    <button
                      onClick={() => {
                        onRestoreVersion(selectedVersion.code);
                        onClose();
                      }}
                      className="flex items-center gap-1.5 rounded-xl border border-blue-400/30 bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-1 text-xs font-semibold text-white shadow hover:brightness-110 transition-all"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Restore This Version</span>
                    </button>
                  )}
                </div>

                <div className="flex-1 p-4 overflow-auto font-mono text-xs text-gray-200 leading-relaxed whitespace-pre select-text">
                  {selectedVersion.code}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 text-xs text-gray-400 p-8">
                Select a version snapshot on the left to preview code.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end border-t border-white/10 pt-3">
          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-[#0a0a0d] px-4 py-2 text-xs font-medium text-gray-300 hover:bg-[#121218]"
          >
            Close
          </button>
        </div>
      </Card3D>
    </div>
  );
};
