import React, { useState, useEffect, useRef, useCallback } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import {
  Play,
  Save,
  Share2,
  Download,
  Copy,
  History,
  Check,
  Terminal as TerminalIcon,
  RotateCcw,
  Sparkles,
  Lock,
  Eye,
  GitFork,
  Code2,
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  AlertTriangle,
  Wand2,
} from 'lucide-react';
import { Project, ExecutionResult, UserProfile, ProjectPrivacy } from '../types';
import { executePythonCode } from '../lib/pyodide';
import { formatPythonCode } from '../lib/pythonFormatter';
import { VersionHistoryModal } from './VersionHistoryModal';
import { ShareModal } from './ShareModal';

interface EditorWorkspaceProps {
  project: Project;
  currentUser: UserProfile | null;
  onUpdateProjectCode: (projectId: string, code: string) => Promise<void>;
  onRenameProject: (projectId: string, newTitle: string) => Promise<void>;
  onTogglePrivacy: (projectId: string, currentPrivacy: ProjectPrivacy) => Promise<void>;
  onSaveVersionSnapshot: (projectId: string, code: string, label?: string) => Promise<void>;
  onForkProject: (project: Project) => void;
  onDeleteProject: (projectId: string) => Promise<void>;
}

export const EditorWorkspace: React.FC<EditorWorkspaceProps> = ({
  project,
  currentUser,
  onUpdateProjectCode,
  onRenameProject,
  onTogglePrivacy,
  onSaveVersionSnapshot,
  onForkProject,
  onDeleteProject,
}) => {
  const [code, setCode] = useState(project.code);
  const [title, setTitle] = useState(project.title);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  
  // Execution state
  const [executionResult, setExecutionResult] = useState<ExecutionResult>({
    output: 'Press "Run Code" (or Ctrl+Enter) to execute Python in browser.',
    error: null,
    executionTimeMs: 0,
    status: 'idle',
  });

  // UI Modals & Panels
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isFormattedToast, setIsFormattedToast] = useState(false);
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(true);

  // Auto-save tracking
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving'>('saved');
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<any>(null);

  // Check if current user is owner
  const isOwner = currentUser ? currentUser.uid === project.ownerId : false;

  // Format Code handler (Black / PEP 8 Engine)
  const handleFormatCode = useCallback(() => {
    const formatted = formatPythonCode(code);
    if (formatted !== code) {
      setCode(formatted);
      handleCodeChange(formatted);
      setIsFormattedToast(true);
      setTimeout(() => setIsFormattedToast(false), 2500);
    } else {
      setIsFormattedToast(true);
      setTimeout(() => setIsFormattedToast(false), 1500);
    }
  }, [code, isOwner]);

  // Monaco Editor mount callback to register DocumentFormattingEditProvider
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Register Python format provider for right-click / Shift+Alt+F
    monaco.languages.registerDocumentFormattingEditProvider('python', {
      provideDocumentFormattingEdits(model) {
        const currentContent = model.getValue();
        const formatted = formatPythonCode(currentContent);
        return [
          {
            range: model.getFullModelRange(),
            text: formatted,
          },
        ];
      },
    });
  };

  // Keep local state in sync when project changes
  useEffect(() => {
    setCode(project.code);
    setTitle(project.title);
    setSaveStatus('saved');
  }, [project.id]);

  // Debounced auto-save effect
  const handleCodeChange = (newCode: string | undefined) => {
    const updated = newCode || '';
    setCode(updated);

    if (!isOwner) return; // Read only for non-owners

    setSaveStatus('unsaved');

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        await onUpdateProjectCode(project.id, updated);
        setSaveStatus('saved');
      } catch (err) {
        console.error('Auto-save error:', err);
        setSaveStatus('unsaved');
      }
    }, 1500);
  };

  // Run Code Execution Handler
  const handleRunCode = async () => {
    setExecutionResult({
      output: 'Initializing Python WebAssembly environment...',
      error: null,
      executionTimeMs: 0,
      status: 'running',
    });

    setIsConsoleExpanded(true);

    const result = await executePythonCode(code);
    setExecutionResult(result);
  };

  // Manual Save Snapshot
  const handleManualSaveSnapshot = async () => {
    if (!isOwner) return;
    setSaveStatus('saving');
    try {
      await onUpdateProjectCode(project.id, code);
      await onSaveVersionSnapshot(project.id, code, `Snapshot - ${new Date().toLocaleTimeString()}`);
      setSaveStatus('saved');
    } catch (err) {
      console.error('Save snapshot error:', err);
      setSaveStatus('unsaved');
    }
  };

  // Copy code
  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Download .py file
  const handleDownloadFile = () => {
    const blob = new Blob([code], { type: 'text/x-python;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/\s+/g, '_') || 'script'}.py`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Rename title
  const handleTitleSubmit = async () => {
    if (!isOwner || !title.trim()) return;
    setIsEditingTitle(false);
    if (title.trim() !== project.title) {
      await onRenameProject(project.id, title.trim());
    }
  };

  // Keyboard shortcut Ctrl/Cmd+Enter for Run, Ctrl/Cmd+S for Save
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunCode();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isOwner) handleManualSaveSnapshot();
      }
    },
    [code, isOwner]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex flex-col h-[calc(100vh-61px)] bg-[#050505] text-gray-200 overflow-hidden">
      
      {/* Read-Only Banner for Shared non-owner projects */}
      {!isOwner && (
        <div className="bg-amber-950/80 border-b border-amber-800/60 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              <strong>Read-Only Mode:</strong> You are viewing a shared project created by{' '}
              <span className="font-semibold text-amber-100">{project.ownerName || 'another developer'}</span>.
            </span>
          </div>

          <button
            onClick={() => onForkProject(project)}
            className="flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-amber-600 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-500 shadow transition-all"
          >
            <GitFork className="h-3.5 w-3.5" />
            <span>Fork / Save Copy to My Workspace</span>
          </button>
        </div>
      )}

      {/* Workspace Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 bg-[#08080a] px-4 py-2.5 shadow-sm">
        
        {/* Left Project Info & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-950/60 text-blue-400 shadow">
            <Code2 className="h-4 w-4" />
          </div>

          <div className="flex items-center gap-2 min-w-0">
            {isEditingTitle && isOwner ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => e.key === 'Enter' && handleTitleSubmit()}
                autoFocus
                className="rounded-lg border border-blue-500 bg-[#050505] px-2 py-1 text-xs font-bold text-white focus:outline-none"
              />
            ) : (
              <h2
                onClick={() => isOwner && setIsEditingTitle(true)}
                className={`text-sm font-bold text-gray-100 truncate ${
                  isOwner ? 'cursor-pointer hover:text-blue-400 hover:underline' : ''
                }`}
                title={isOwner ? 'Click to rename project' : title}
              >
                {title}
              </h2>
            )}

            {/* Save Status Badge */}
            {isOwner && (
              <span className="text-[10px] font-mono text-gray-400 px-2 py-0.5 rounded bg-[#050505] border border-white/5 shrink-0">
                {saveStatus === 'saved' && (
                  <span className="text-blue-400 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Auto-saved
                  </span>
                )}
                {saveStatus === 'unsaved' && <span className="text-amber-400">Unsaved edits...</span>}
                {saveStatus === 'saving' && <span className="text-indigo-400 animate-pulse">Saving...</span>}
              </span>
            )}
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Run Code Button */}
          <button
            onClick={handleRunCode}
            disabled={executionResult.status === 'running'}
            className="flex items-center gap-2 rounded-xl border border-blue-400/30 bg-gradient-to-r from-blue-600 via-indigo-600 to-amber-500 px-4 py-1.5 text-xs font-bold text-white shadow-[0_4px_15px_rgba(37,99,235,0.35)] hover:brightness-110 active:scale-95 disabled:opacity-50 transition-all"
            title="Execute Python script (Ctrl+Enter)"
          >
            <Play className={`h-3.5 w-3.5 fill-current ${executionResult.status === 'running' ? 'animate-spin' : ''}`} />
            <span>{executionResult.status === 'running' ? 'Running...' : 'Run Code'}</span>
          </button>

          {/* Manual Save Snapshot */}
          {isOwner && (
            <button
              onClick={handleManualSaveSnapshot}
              className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#0a0a0d] px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-[#121218] transition-all shadow"
              title="Save code snapshot (Ctrl+S)"
            >
              <Save className="h-3.5 w-3.5 text-blue-400" />
              <span className="hidden sm:inline">Save Snapshot</span>
            </button>
          )}

          {/* Version History */}
          <button
            onClick={() => setShowVersionHistory(true)}
            className="flex items-center gap-1.5 rounded-xl border border-white/5 bg-[#050505] px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-[#101015] transition-all"
            title="View code version history"
          >
            <History className="h-3.5 w-3.5 text-indigo-400" />
            <span className="hidden md:inline">History</span>
          </button>

          {/* Format Code Button */}
          <button
            onClick={handleFormatCode}
            className="flex items-center gap-1.5 rounded-xl border border-white/5 bg-[#050505] px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-[#101015] hover:text-blue-400 transition-all"
            title="Auto-format Python code (Black / PEP 8 style) [Shift+Alt+F]"
          >
            <Wand2 className="h-3.5 w-3.5 text-blue-400" />
            <span className="hidden sm:inline">Format</span>
          </button>

          {/* Share Button */}
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-1.5 rounded-xl border border-white/5 bg-[#050505] px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-[#101015] transition-all"
            title="Share project link"
          >
            <Share2 className="h-3.5 w-3.5 text-indigo-400" />
            <span className="hidden md:inline">Share</span>
          </button>

          {/* Copy Code */}
          <button
            onClick={handleCopyCode}
            className="rounded-xl border border-white/5 bg-[#050505] p-2 text-gray-400 hover:text-gray-200 hover:bg-[#101015] transition-colors"
            title="Copy Python code to clipboard"
          >
            {copiedCode ? <Check className="h-3.5 w-3.5 text-blue-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>

          {/* Download File */}
          <button
            onClick={handleDownloadFile}
            className="rounded-xl border border-white/5 bg-[#050505] p-2 text-gray-400 hover:text-gray-200 hover:bg-[#101015] transition-colors"
            title="Download .py file"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Main Workspace Split: Monaco Code Editor + Output Console */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0 relative">
        
        {/* Monaco Editor Container */}
        <div className="flex-1 min-h-0 bg-[#050505] relative">
          {isFormattedToast && (
            <div className="absolute top-3 right-6 z-20 flex items-center gap-1.5 rounded-xl border border-blue-500/40 bg-blue-950/90 backdrop-blur-md px-3 py-1.5 text-xs text-blue-300 shadow-xl animate-fade-in font-mono">
              <Wand2 className="h-3.5 w-3.5 text-blue-400" />
              <span>Python Code Formatted (PEP 8)</span>
            </div>
          )}

          <Editor
            height="100%"
            defaultLanguage="python"
            theme="vs-dark"
            value={code}
            onChange={handleCodeChange}
            onMount={handleEditorDidMount}
            options={{
              readOnly: !isOwner,
              fontSize: 14,
              minimap: { enabled: true },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 4,
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",
              padding: { top: 12, bottom: 12 },
              lineNumbersMinChars: 3,
            }}
          />
        </div>

        {/* Console / Terminal Drawer */}
        <div
          className={`border-t md:border-t-0 md:border-l border-white/5 bg-[#050505] flex flex-col transition-all duration-300 ${
            isConsoleExpanded ? 'h-64 md:h-auto md:w-96' : 'h-10 md:h-auto md:w-12'
          }`}
        >
          {/* Console Header Bar */}
          <div
            onClick={() => setIsConsoleExpanded(!isConsoleExpanded)}
            className="flex items-center justify-between border-b border-white/5 bg-[#08080a] px-3 py-2 cursor-pointer select-none text-xs font-mono"
          >
            <div className="flex items-center gap-2 text-gray-300">
              <TerminalIcon className="h-4 w-4 text-blue-400" />
              <span className="font-bold">Terminal Output</span>
              {executionResult.status === 'success' && (
                <span className="text-[10px] text-blue-400 bg-blue-950/80 border border-blue-800/60 px-1.5 py-0.5 rounded">
                  {executionResult.executionTimeMs}ms
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExecutionResult({ output: '', error: null, executionTimeMs: 0, status: 'idle' });
                }}
                className="rounded p-1 text-gray-400 hover:text-gray-200"
                title="Clear console output"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              {isConsoleExpanded ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronUp className="h-4 w-4 text-gray-400" />}
            </div>
          </div>

          {/* Console Output Logs */}
          {isConsoleExpanded && (
            <div className="flex-1 p-3 font-mono text-xs overflow-auto leading-relaxed select-text bg-[#030303]">
              {executionResult.status === 'running' && (
                <div className="flex items-center gap-2 text-blue-400 animate-pulse">
                  <Sparkles className="h-4 w-4 animate-spin" />
                  <span>Running Python WebAssembly code...</span>
                </div>
              )}

              {executionResult.error ? (
                <div className="text-red-400 whitespace-pre-wrap">
                  <p className="font-bold border-b border-red-900/50 pb-1 mb-2 text-red-300">
                    Traceback / Execution Error:
                  </p>
                  {executionResult.error}
                </div>
              ) : (
                <pre className="text-blue-300/90 whitespace-pre-wrap break-words">
                  {executionResult.output}
                </pre>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Version History Modal */}
      {showVersionHistory && (
        <VersionHistoryModal
          projectId={project.id}
          currentCode={code}
          isOwner={isOwner}
          onClose={() => setShowVersionHistory(false)}
          onRestoreVersion={(restoredCode) => {
            setCode(restoredCode);
            if (isOwner) onUpdateProjectCode(project.id, restoredCode);
          }}
        />
      )}

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          project={project}
          onClose={() => setShowShareModal(false)}
          onTogglePrivacy={onTogglePrivacy}
        />
      )}

    </div>
  );
};
