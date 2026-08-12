import React from 'react';
import { Keyboard, X, Terminal, Code2, Play, Bug, Save, Wand2, Search, Trash2 } from 'lucide-react';
import { Card3D } from './3d/Card3D';

interface ShortcutGroup {
  category: string;
  items: { key: string; description: string; icon?: React.ReactNode }[];
}

const SHORTCUT_GROUPS: ShortcutGroup[] = [
  {
    category: 'Execution & Debugging',
    items: [
      { key: 'F5 or Ctrl + Enter', description: 'Run Python script module in WASM engine', icon: <Play className="h-3.5 w-3.5 text-emerald-400" /> },
      { key: 'F10', description: 'Step over next execution line in Debugger', icon: <Bug className="h-3.5 w-3.5 text-amber-400" /> },
      { key: 'Ctrl + S', description: 'Save version snapshot to Cloud workspace', icon: <Save className="h-3.5 w-3.5 text-blue-400" /> },
      { key: 'Shift + Alt + F', description: 'Auto-format Python code (Black / PEP 8)', icon: <Wand2 className="h-3.5 w-3.5 text-amber-400" /> },
    ],
  },
  {
    category: 'Editor Navigation & Editing',
    items: [
      { key: 'Ctrl + /', description: 'Toggle line / selection comment (#)', icon: <Code2 className="h-3.5 w-3.5 text-slate-400" /> },
      { key: 'Ctrl + F', description: 'Find text inside active script', icon: <Search className="h-3.5 w-3.5 text-slate-400" /> },
      { key: 'Ctrl + H', description: 'Replace text in active file', icon: <Search className="h-3.5 w-3.5 text-slate-400" /> },
      { key: 'Alt + Z', description: 'Toggle editor word wrap mode', icon: <Terminal className="h-3.5 w-3.5 text-slate-400" /> },
    ],
  },
];

interface KeyboardShortcutsModalProps {
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07090e]/85 p-4 backdrop-blur-xs">
      <Card3D className="w-full max-w-lg p-6 space-y-5" hoverEffect={false}>
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#161a28] border border-amber-500/40 text-amber-400 shadow-md">
              <Keyboard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white">Keyboard Shortcuts</h2>
              <p className="text-xs text-slate-400">Essential hotkeys for rapid Python development</p>
            </div>
          </div>

          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Shortcut Groups */}
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.category} className="space-y-2">
              <h3 className="text-xs font-bold text-amber-300 uppercase tracking-wider font-mono">
                {group.category}
              </h3>
              <div className="rounded-xl border border-slate-800 bg-[#0a0c12] divide-y divide-slate-800/80 shadow-inner">
                {group.items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 text-xs">
                    <div className="flex items-center gap-2 text-slate-200">
                      {item.icon}
                      <span>{item.description}</span>
                    </div>
                    <kbd className="px-2.5 py-1 rounded-lg bg-[#141724] border border-slate-700 text-amber-300 font-mono text-[11px] font-bold shadow-xs">
                      {item.key}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="btn-3d-gold px-4 py-2 rounded-xl text-xs font-extrabold text-white"
          >
            Got it
          </button>
        </div>

      </Card3D>
    </div>
  );
};
