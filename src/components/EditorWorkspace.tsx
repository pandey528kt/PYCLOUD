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
  Cpu,
  CornerDownLeft,
  Trash,
  Bug,
  StepForward,
  Square,
  CircleDot,
  Variable,
  ArrowRight,
  Package,
  Keyboard,
  FileCode,
  WrapText,
  ZoomIn,
  ZoomOut,
  Layers,
  Indent,
  Outdent,
  Plus,
  FileText,
} from 'lucide-react';
import { Project, ExecutionResult, UserProfile, ProjectPrivacy, DebugVariable } from '../types';
import {
  executePythonCode,
  executeIdleCommand,
  executeScriptInIdle,
  preloadPythonEngine,
  resetIdleEnvironment,
  getIdleVariables,
  IDLE_WELCOME_BANNER,
} from '../lib/pyodide';
import {
  executeScriptWithDebugger,
  resolveDebugAction,
  setDebugBreakpoints,
} from '../lib/pyDebugger';
import { formatPythonCode } from '../lib/pythonFormatter';
import { VersionHistoryModal } from './VersionHistoryModal';
import { ShareModal } from './ShareModal';
import { CodeSnippetsModal } from './CodeSnippetsModal';
import { PackageManagerModal } from './PackageManagerModal';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { Card3D } from './3d/Card3D';

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
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showSnippetsModal, setShowSnippetsModal] = useState(false);
  const [showPackagesModal, setShowPackagesModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [lastClearedCode, setLastClearedCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isFormattedToast, setIsFormattedToast] = useState(false);
  const [isConsoleExpanded, setIsConsoleExpanded] = useState(true);

  // Editor Display & Tab Settings
  const [fontSize, setFontSize] = useState<number>(14);
  const [wordWrap, setWordWrap] = useState<'on' | 'off'>('on');
  const [showMinimap, setShowMinimap] = useState<boolean>(true);
  const [tabSize, setTabSize] = useState<number>(4);

  // Script File Tabs
  const [scriptTabs, setScriptTabs] = useState<Array<{ id: string; title: string; code: string }>>([
    { id: 'main', title: 'main.py', code: project.code || '' },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('main');

  // Workspace Execution Mode: Script Mode (.py Editor) vs Interactive Mode (Python IDLE Shell)
  const [workspaceMode, setWorkspaceMode] = useState<'script' | 'interactive'>('script');
  const [editorTheme, setEditorTheme] = useState<'vscode-dark' | 'idle-light'>('vscode-dark');
  const [idleVariables, setIdleVariables] = useState<Array<{ name: string; type: string; value: string }>>([]);

  // Refresh variables in IDLE environment
  const refreshIdleVars = useCallback(async () => {
    const vars = await getIdleVariables();
    setIdleVariables(vars);
  }, []);

  // Python IDLE Interactive Shell State
  const [consoleTab, setConsoleTab] = useState<'terminal' | 'idle' | 'debug'>('idle'); // Python IDLE active by default
  const [idleLogs, setIdleLogs] = useState<Array<{ id: string; type: 'banner' | 'cmd' | 'out' | 'err'; text: string }>>([
    { id: 'banner', type: 'banner', text: IDLE_WELCOME_BANNER },
  ]);
  const [idleInput, setIdleInput] = useState('');
  const [idleHistory, setIdleHistory] = useState<string[]>([]);
  const [idleHistoryIndex, setIdleHistoryIndex] = useState<number>(-1);
  const [isIdleRunning, setIsIdleRunning] = useState(false);
  const idleConsoleEndRef = useRef<HTMLDivElement | null>(null);

  // Python Step-by-Step Debugger State
  const [isDebugActive, setIsDebugActive] = useState(false);
  const [isDebugPaused, setIsDebugPaused] = useState(false);
  const [debugCurrentLine, setDebugCurrentLine] = useState<number | null>(null);
  const [debugBreakpoints, setDebugBreakpointsState] = useState<number[]>([]);
  const [debugVariables, setDebugVariables] = useState<DebugVariable[]>([]);
  const editorDecorationsRef = useRef<string[]>([]);

  // Toggle Breakpoint Handler
  const toggleBreakpoint = useCallback((lineNumber: number) => {
    setDebugBreakpointsState((prev) => {
      const exists = prev.includes(lineNumber);
      const updated = exists ? prev.filter((l) => l !== lineNumber) : [...prev, lineNumber].sort((a, b) => a - b);
      setDebugBreakpoints(updated);
      return updated;
    });
  }, []);

  // Auto-scroll IDLE shell console
  useEffect(() => {
    if ((consoleTab === 'idle' || workspaceMode === 'interactive') && isConsoleExpanded) {
      idleConsoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [idleLogs, consoleTab, workspaceMode, isConsoleExpanded]);

  // IDLE Command Submit Handler
  const handleIdleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cmd = idleInput.trim();
    if (!cmd || isIdleRunning) return;

    setIdleInput('');
    setIdleHistory((prev) => [...prev, cmd]);
    setIdleHistoryIndex(-1);

    setIdleLogs((prev) => [...prev, { id: `cmd-${Date.now()}`, type: 'cmd', text: `>>> ${cmd}` }]);
    setIsIdleRunning(true);

    const res = await executeIdleCommand(cmd);

    if (res.output) {
      setIdleLogs((prev) => [...prev, { id: `out-${Date.now()}`, type: 'out', text: res.output }]);
    }
    if (res.error) {
      setIdleLogs((prev) => [...prev, { id: `err-${Date.now()}`, type: 'err', text: res.error }]);
    }
    setIsIdleRunning(false);
    refreshIdleVars();
  };

  // History Navigation with Up/Down Arrow
  const handleIdleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (idleHistory.length === 0) return;
      const nextIndex = idleHistoryIndex === -1 ? idleHistory.length - 1 : Math.max(0, idleHistoryIndex - 1);
      setIdleHistoryIndex(nextIndex);
      setIdleInput(idleHistory[nextIndex] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (idleHistoryIndex === -1) return;
      const nextIndex = idleHistoryIndex + 1;
      if (nextIndex >= idleHistory.length) {
        setIdleHistoryIndex(-1);
        setIdleInput('');
      } else {
        setIdleHistoryIndex(nextIndex);
        setIdleInput(idleHistory[nextIndex] || '');
      }
    }
  };

  const handleResetIdle = async () => {
    await resetIdleEnvironment();
    setIdleLogs([
      { id: 'banner', type: 'banner', text: IDLE_WELCOME_BANNER },
      { id: `reset-${Date.now()}`, type: 'out', text: '[Python IDLE environment reset clean]' },
    ]);
  };

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

  // Monaco Editor mount callback to register themes and format providers
  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Define VS Code Dark+ Theme
    monaco.editor.defineTheme('vscode-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '569CD6', fontStyle: 'bold' },
        { token: 'type', foreground: '4EC9B0' },
        { token: 'function', foreground: 'DCDCAA' },
        { token: 'string', foreground: 'CE9178' },
        { token: 'comment', foreground: '6A9955', fontStyle: 'italic' },
        { token: 'number', foreground: 'B5CEA8' },
        { token: 'delimiter', foreground: 'D4D4D4' },
      ],
      colors: {
        'editor.background': '#1E1E1E',
        'editor.foreground': '#D4D4D4',
        'editorCursor.foreground': '#AEAFAD',
        'editor.lineHighlightBackground': '#2A2D2E',
        'editorLineNumber.foreground': '#858585',
        'editorLineNumber.activeForeground': '#C6C6C6',
        'editor.selectionBackground': '#264F78',
        'editorIndentGuide.background1': '#404040',
        'editorIndentGuide.activeBackground1': '#707070',
      },
    });

    // Define Python IDLE Classic Script Mode Theme
    monaco.editor.defineTheme('idle-light', {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'keyword', foreground: '700070', fontStyle: 'bold' },
        { token: 'function', foreground: '0000FF', fontStyle: 'bold' },
        { token: 'string', foreground: '008000' },
        { token: 'comment', foreground: 'DD0000', fontStyle: 'italic' },
        { token: 'number', foreground: '000000' },
        { token: 'type', foreground: '0000FF' },
      ],
      colors: {
        'editor.background': '#FFFFFF',
        'editor.foreground': '#000000',
        'editorCursor.foreground': '#000000',
        'editor.lineHighlightBackground': '#F3F3F3',
        'editorLineNumber.foreground': '#7A7A7A',
        'editorLineNumber.activeForeground': '#000000',
        'editor.selectionBackground': '#B5D5FF',
      },
    });

    // Set initial theme
    monaco.editor.setTheme(editorTheme);

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

    // Listen to margin mouse clicks to toggle breakpoints
    editor.onMouseDown((e) => {
      if (
        e.target.type === monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN ||
        e.target.type === monaco.editor.MouseTargetType.GUTTER_LINE_NUMBERS
      ) {
        const line = e.target.position?.lineNumber;
        if (line) {
          toggleBreakpoint(line);
        }
      }
    });
  };

  // Sync Monaco editor decorations for breakpoints and current debug line highlight
  useEffect(() => {
    if (!editorRef.current || !(window as any).monaco) return;
    const monaco = (window as any).monaco;

    const newDecorations: any[] = [];

    // Add red breakpoint glyph dots
    debugBreakpoints.forEach((line) => {
      newDecorations.push({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: false,
          glyphMarginClassName: 'debug-breakpoint-glyph',
          glyphMarginHoverMessage: { value: `Breakpoint at line ${line}` },
        },
      });
    });

    // Add yellow execution arrow and line highlight if currently paused
    if (isDebugPaused && debugCurrentLine) {
      newDecorations.push({
        range: new monaco.Range(debugCurrentLine, 1, debugCurrentLine, 1),
        options: {
          isWholeLine: true,
          className: 'debug-current-line-highlight',
          glyphMarginClassName: 'debug-current-line-arrow',
          glyphMarginHoverMessage: { value: `Paused at line ${debugCurrentLine}` },
        },
      });
      editorRef.current.revealLineInCenter(debugCurrentLine);
    }

    editorDecorationsRef.current = editorRef.current.deltaDecorations(
      editorDecorationsRef.current,
      newDecorations
    );
  }, [debugBreakpoints, debugCurrentLine, isDebugPaused, toggleBreakpoint]);

  // Clear All Code Handler
  const handleClearAllCode = () => {
    setLastClearedCode(code);
    handleCodeChange('');
    setShowClearConfirm(false);
  };

  const handleUndoClearCode = () => {
    if (lastClearedCode !== null) {
      handleCodeChange(lastClearedCode);
      setLastClearedCode(null);
    }
  };

  // Indent & Outdent Tab Handlers
  const handleIndentTab = () => {
    if (editorRef.current) {
      editorRef.current.trigger('keyboard', 'tab', null);
      editorRef.current.focus();
    }
  };

  const handleOutdentTab = () => {
    if (editorRef.current) {
      editorRef.current.trigger('source', 'editor.action.outdentLines', null);
      editorRef.current.focus();
    }
  };

  // Script File Tabs Management
  const handleAddNewScriptTab = () => {
    const nextNum = scriptTabs.length + 1;
    const newTabId = `tab_${Date.now()}`;
    const newTab = {
      id: newTabId,
      title: `script_${nextNum}.py`,
      code: `# Python module script ${nextNum}\nprint("Hello from script_${nextNum}.py!")\n`,
    };
    setScriptTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTabId);
    setCode(newTab.code);
  };

  const handleSelectScriptTab = (tabId: string) => {
    setScriptTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, code } : t))
    );
    setActiveTabId(tabId);
    const target = scriptTabs.find((t) => t.id === tabId);
    if (target) {
      setCode(target.code);
    }
  };

  const handleCloseScriptTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (scriptTabs.length <= 1) return;
    const nextTabs = scriptTabs.filter((t) => t.id !== tabId);
    setScriptTabs(nextTabs);
    if (activeTabId === tabId) {
      const fallback = nextTabs[nextTabs.length - 1];
      setActiveTabId(fallback.id);
      setCode(fallback.code);
    }
  };

  // Keep local state in sync when project changes
  useEffect(() => {
    setCode(project.code);
    setTitle(project.title);
    setScriptTabs([
      { id: 'main', title: 'main.py', code: project.code || '' }
    ]);
    setActiveTabId('main');
    setSaveStatus('saved');
    preloadPythonEngine();
  }, [project.id]);

  // Update Monaco theme dynamically
  useEffect(() => {
    if ((window as any).monaco) {
      (window as any).monaco.editor.setTheme(editorTheme);
    }
  }, [editorTheme]);

  // Debounced auto-save effect
  const handleCodeChange = (newCode: string | undefined) => {
    const updated = newCode || '';
    setCode(updated);
    setScriptTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, code: updated } : t))
    );

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

  // Run Code Execution Handler (Executes script directly inside Python IDLE REPL Engine)
  const handleRunCode = async () => {
    setIsConsoleExpanded(true);
    setConsoleTab('idle');

    const fileName = `${(title || project.title || 'script').toLowerCase().replace(/\s+/g, '_')}.py`;
    const restartHeader = `==================== RESTART: /workspace/${fileName} ====================`;

    setIdleLogs((prev) => [
      ...prev,
      { id: `restart-${Date.now()}`, type: 'banner', text: restartHeader },
    ]);

    setIsIdleRunning(true);

    setExecutionResult({
      output: 'Running script in Python IDLE engine...',
      error: null,
      executionTimeMs: 0,
      status: 'running',
    });

    const result = await executeScriptInIdle(code, fileName);

    if (result.output) {
      setIdleLogs((prev) => [
        ...prev,
        { id: `out-${Date.now()}`, type: 'out', text: result.output },
      ]);
    }
    if (result.error) {
      setIdleLogs((prev) => [
        ...prev,
        { id: `err-${Date.now()}`, type: 'err', text: result.error },
      ]);
    }

    setExecutionResult(result);
    setIsIdleRunning(false);
    await refreshIdleVars();
  };

  // Start Step-by-Step Debugger Session Handler
  const handleStartDebugging = async () => {
    setIsDebugActive(true);
    setIsDebugPaused(false);
    setDebugCurrentLine(null);
    setIsConsoleExpanded(true);
    setConsoleTab('debug');

    const fileName = `${(title || project.title || 'script').toLowerCase().replace(/\s+/g, '_')}.py`;

    setExecutionResult({
      output: `🚀 Debugger initialized. Click Step (F10) or Continue (F5) to step through line-by-line.\nClick line numbers on the editor margin to toggle breakpoints.`,
      error: null,
      executionTimeMs: 0,
      status: 'running',
    });

    const result = await executeScriptWithDebugger(
      code,
      debugBreakpoints,
      (line, vars) => {
        setIsDebugPaused(true);
        setDebugCurrentLine(line);
        setDebugVariables(vars);
      },
      fileName
    );

    setIsDebugActive(false);
    setIsDebugPaused(false);
    setDebugCurrentLine(null);
    setExecutionResult(result);
  };

  // Debugger Controls: Step Over, Continue, Stop
  const handleDebugStepOver = () => {
    setIsDebugPaused(false);
    resolveDebugAction('step');
  };

  const handleDebugContinue = () => {
    setIsDebugPaused(false);
    resolveDebugAction('continue');
  };

  const handleDebugStop = () => {
    setIsDebugActive(false);
    setIsDebugPaused(false);
    setDebugCurrentLine(null);
    resolveDebugAction('stop');
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

  // Keyboard shortcut F5 or Ctrl/Cmd+Enter for Run Module, Ctrl/Cmd+S for Save
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key === 'Enter')) {
        e.preventDefault();
        handleRunCode();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isOwner) handleManualSaveSnapshot();
      }
    },
    [code, isOwner, title, project]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="flex flex-col h-[calc(100vh-61px)] bg-[#050505] text-gray-200 overflow-hidden">
      
      {/* Restorable Cleared Code Undo Banner */}
      {lastClearedCode !== null && (
        <div className="bg-amber-950/90 border-b border-amber-500/50 px-4 py-2 flex items-center justify-between gap-3 text-xs text-amber-200 shadow-md">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            <span>
              <strong>Code Cleared:</strong> Editor was cleared. Click undo to restore your Python script.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleUndoClearCode}
              className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs transition-all shadow active:scale-95"
            >
              Undo Clear
            </button>
            <button
              onClick={() => setLastClearedCode(null)}
              className="p-1 text-amber-400 hover:text-amber-200 transition-colors"
              title="Dismiss banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

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
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#0c0e16] px-4 py-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
        
        {/* Left Project Info & Title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-amber-500/40 bg-[#161a28] text-amber-400 shadow-inner">
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
                className="rounded-lg border border-amber-500 bg-[#07090e] px-2.5 py-1 text-xs font-extrabold text-white focus:outline-none"
              />
            ) : (
              <h2
                onClick={() => isOwner && setIsEditingTitle(true)}
                className={`text-sm font-extrabold text-slate-100 truncate ${
                  isOwner ? 'cursor-pointer hover:text-amber-400 hover:underline' : ''
                }`}
                title={isOwner ? 'Click to rename project' : title}
              >
                {title}
              </h2>
            )}

            {/* Save Status Badge */}
            {isOwner && (
              <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-[#07090e] border border-slate-800 shrink-0 font-bold">
                {saveStatus === 'saved' && (
                  <span className="text-amber-400 flex items-center gap-1">
                    <Check className="h-3 w-3" /> Auto-saved
                  </span>
                )}
                {saveStatus === 'unsaved' && <span className="text-amber-500">Unsaved edits...</span>}
                {saveStatus === 'saving' && <span className="text-blue-400 animate-pulse">Saving...</span>}
              </span>
            )}
          </div>
        </div>

        {/* Right Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          
          {/* Python IDLE Status Badge */}
          <div
            className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-mono shadow-inner font-bold"
            title="Python 3.12 IDLE Engine installed and ready by default"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Python IDLE 3.12</span>
          </div>

          {/* Run Code / Module Button (Python IDLE Standard F5) */}
          <button
            onClick={() => handleRunCode()}
            disabled={isIdleRunning || isDebugActive}
            className="flex items-center gap-2 btn-3d-emerald rounded-xl px-4 py-1.5 text-xs font-extrabold text-white shadow"
            title="Run Module in Python IDLE Shell (F5 or Ctrl+Enter)"
          >
            <Play className={`h-3.5 w-3.5 fill-current ${isIdleRunning ? 'animate-spin' : ''}`} />
            <span>{isIdleRunning ? 'Running IDLE...' : 'Run Module'}</span>
          </button>

          {/* Debugger Active Controls or Start Debugger Button */}
          {isDebugActive ? (
            <div className="flex items-center gap-1.5 bg-[#141724] border border-amber-500/60 p-1 rounded-xl shadow-lg">
              <button
                onClick={handleDebugContinue}
                disabled={!isDebugPaused}
                className="flex items-center gap-1 px-2.5 py-1 btn-3d-emerald text-white font-extrabold text-xs disabled:opacity-40 rounded-lg"
                title="Continue Execution (F5)"
              >
                <Play className="h-3 w-3 fill-current" />
                <span>Continue</span>
              </button>

              <button
                onClick={handleDebugStepOver}
                disabled={!isDebugPaused}
                className="flex items-center gap-1 px-2.5 py-1 btn-3d-slate text-white font-extrabold text-xs disabled:opacity-40 rounded-lg"
                title="Step Over Current Line (F10)"
              >
                <StepForward className="h-3 w-3" />
                <span>Step Over</span>
              </button>

              <button
                onClick={handleDebugStop}
                className="flex items-center gap-1 px-2.5 py-1 bg-red-700 hover:bg-red-600 border-b-2 border-red-900 text-white font-extrabold text-xs rounded-lg active:translate-y-[1px]"
                title="Stop Debugger Session"
              >
                <Square className="h-3 w-3 fill-current" />
                <span>Stop</span>
              </button>
            </div>
          ) : (
            <button
              onClick={handleStartDebugging}
              disabled={isIdleRunning}
              className="flex items-center gap-1.5 btn-3d-gold rounded-xl px-3.5 py-1.5 text-xs font-extrabold text-white shadow"
              title="Start Step-by-Step Debugger with Breakpoints"
            >
              <Bug className="h-3.5 w-3.5" />
              <span>Debug Script</span>
              {debugBreakpoints.length > 0 && (
                <span className="ml-1 rounded-full bg-red-600 text-[10px] px-1.5 py-0.2 font-black text-white">
                  {debugBreakpoints.length}
                </span>
              )}
            </button>
          )}

          {/* Manual Save Snapshot */}
          {isOwner && (
            <button
              onClick={handleManualSaveSnapshot}
              className="flex items-center gap-1.5 btn-3d-dark rounded-xl px-3 py-1.5 text-xs font-bold text-slate-200"
              title="Save code snapshot (Ctrl+S)"
            >
              <Save className="h-3.5 w-3.5 text-amber-400" />
              <span className="hidden sm:inline">Save</span>
            </button>
          )}

          {/* Version History */}
          <button
            onClick={() => setShowVersionHistory(true)}
            className="flex items-center gap-1.5 btn-3d-dark rounded-xl px-3 py-1.5 text-xs font-bold text-slate-300"
            title="View code version history"
          >
            <History className="h-3.5 w-3.5 text-blue-400" />
            <span className="hidden md:inline">History</span>
          </button>

          {/* Format Code Button */}
          <button
            onClick={handleFormatCode}
            className="flex items-center gap-1.5 btn-3d-dark rounded-xl px-3 py-1.5 text-xs font-bold text-slate-300"
            title="Auto-format Python code (Black / PEP 8 style) [Shift+Alt+F]"
          >
            <Wand2 className="h-3.5 w-3.5 text-amber-400" />
            <span className="hidden sm:inline">Format</span>
          </button>

          {/* Share Button */}
          <button
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-1.5 btn-3d-dark rounded-xl px-3 py-1.5 text-xs font-bold text-slate-300"
            title="Share project link"
          >
            <Share2 className="h-3.5 w-3.5 text-blue-400" />
            <span className="hidden md:inline">Share</span>
          </button>

          {/* Copy Code */}
          <button
            onClick={handleCopyCode}
            className="btn-3d-dark rounded-xl p-2 text-slate-300"
            title="Copy Python code to clipboard"
          >
            {copiedCode ? <Check className="h-3.5 w-3.5 text-amber-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>

          {/* Download File */}
          <button
            onClick={handleDownloadFile}
            className="btn-3d-dark rounded-xl p-2 text-slate-300"
            title="Download .py file"
          >
            <Download className="h-3.5 w-3.5" />
          </button>

          {/* Clear All Code Button */}
          <button
            onClick={() => setShowClearConfirm(true)}
            disabled={!code}
            className="flex items-center gap-1.5 btn-3d-dark rounded-xl px-3 py-1.5 text-xs font-bold text-slate-300 hover:text-red-400 disabled:opacity-40 transition-colors"
            title="Clear all code in python editor"
          >
            <Trash2 className="h-3.5 w-3.5 text-red-400" />
            <span className="hidden sm:inline">Clear Code</span>
          </button>
        </div>
      </div>

      {/* Workspace Sub-Header: Execution Mode Selector & Theme Switcher */}
      <div className="flex items-center justify-between border-b border-white/5 bg-[#060608] px-4 py-1.5 text-xs font-mono select-none flex-wrap gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400 font-medium text-[11px] uppercase tracking-wider hidden sm:inline">Mode:</span>
            <div className="flex items-center bg-[#0d0d12] p-0.5 rounded-xl border border-white/10 shadow-inner">
              <button
                onClick={() => setWorkspaceMode('script')}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                  workspaceMode === 'script'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
                title="Script Mode: Multi-line Python file editor and full output runner"
              >
                <Code2 className="h-3.5 w-3.5" />
                <span>Script Mode (.py)</span>
              </button>

              <button
                onClick={() => {
                  setWorkspaceMode('interactive');
                  refreshIdleVars();
                }}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg font-bold text-xs transition-all ${
                  workspaceMode === 'interactive'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                }`}
                title="Interactive Mode: Python IDLE line-by-line REPL shell"
              >
                <Cpu className="h-3.5 w-3.5 text-emerald-300" />
                <span>Interactive Mode (IDLE Shell)</span>
              </button>
            </div>
          </div>

          {/* Theme Selector for Editor */}
          {workspaceMode === 'script' && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 font-medium text-[11px] uppercase tracking-wider hidden sm:inline">Interface Theme:</span>
              <div className="flex items-center bg-[#0d0d12] p-0.5 rounded-xl border border-white/10 shadow-inner">
                <button
                  onClick={() => setEditorTheme('vscode-dark')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium text-xs transition-all ${
                    editorTheme === 'vscode-dark'
                      ? 'bg-blue-950/90 text-blue-300 border border-blue-500/40 shadow-sm'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }`}
                  title="VS Code Dark+ IDE Interface"
                >
                  <span>🌙 VS Code Dark+</span>
                </button>

                <button
                  onClick={() => setEditorTheme('idle-light')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium text-xs transition-all ${
                    editorTheme === 'idle-light'
                      ? 'bg-amber-100 text-amber-950 font-bold border border-amber-300 shadow-sm'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }`}
                  title="Python IDLE Script Mode Classic Interface"
                >
                  <span>☀️ IDLE Classic</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-gray-400">
          {workspaceMode === 'script' ? (
            <span className="hidden md:inline text-blue-300/80">
              💡 Write script &amp; click <strong>Run Code</strong> or press <strong>Ctrl+Enter</strong>
            </span>
          ) : (
            <span className="hidden md:inline text-emerald-300/80">
              ⚡ Live IDLE REPL: Type Python commands &amp; press <strong>Enter</strong>
            </span>
          )}
        </div>
      </div>

      {/* Main Workspace Area: Mode Conditioned */}
      {workspaceMode === 'interactive' ? (
        /* FULL INTERACTIVE MODE VIEW */
        <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-[#030303] relative">
          
          {/* Main IDLE Shell Window */}
          <div className="flex-1 flex flex-col min-h-0 border-r border-white/5">
            {/* IDLE Shell Top Bar */}
            <div className="flex items-center justify-between border-b border-white/5 bg-[#08080a] px-4 py-2 text-xs font-mono">
              <div className="flex items-center gap-2 text-emerald-300 font-bold">
                <Cpu className="h-4 w-4 text-emerald-400" />
                <span>Python 3.12 IDLE Shell (Interactive REPL)</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleIdleSubmit();
                  }}
                  onClickCapture={handleResetIdle}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-emerald-300 transition-all text-xs"
                  title="Reset IDLE Session"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset IDLE</span>
                </button>

                <button
                  onClick={() =>
                    setIdleLogs([{ id: 'banner', type: 'banner', text: IDLE_WELCOME_BANNER }])
                  }
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-red-300 transition-all text-xs"
                  title="Clear Shell Screen"
                >
                  <Trash className="h-3.5 w-3.5" />
                  <span>Clear Screen</span>
                </button>
              </div>
            </div>

            {/* Quick Sample Snippets Bar */}
            <div className="flex items-center gap-2 border-b border-white/5 bg-[#050508] px-4 py-1.5 text-xs overflow-x-auto scrollbar-none">
              <span className="text-gray-500 font-mono text-[10px] shrink-0">Quick Presets:</span>
              {[
                { label: 'math.sqrt(144)', cmd: 'import math\nmath.sqrt(144)' },
                { label: 'list comprehension', cmd: '[x**2 for x in range(10)]' },
                { label: 'dict preview', cmd: '{"lang": "Python", "version": 3.12, "mode": "IDLE"}' },
                { label: 'numpy array', cmd: 'import numpy as np\nnp.array([1, 2, 3, 4])' },
                { label: 'datetime.now()', cmd: 'from datetime import datetime\ndatetime.now().isoformat()' },
              ].map((preset, idx) => (
                <button
                  key={idx}
                  onClick={async () => {
                    setIdleLogs((prev) => [...prev, { id: `preset-${Date.now()}`, type: 'cmd', text: `>>> ${preset.cmd}` }]);
                    setIsIdleRunning(true);
                    const res = await executeIdleCommand(preset.cmd);
                    if (res.output) {
                      setIdleLogs((prev) => [...prev, { id: `out-${Date.now()}`, type: 'out', text: res.output }]);
                    }
                    if (res.error) {
                      setIdleLogs((prev) => [...prev, { id: `err-${Date.now()}`, type: 'err', text: res.error }]);
                    }
                    setIsIdleRunning(false);
                    refreshIdleVars();
                  }}
                  className="shrink-0 px-2.5 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60 transition-all font-mono text-[11px]"
                >
                  + {preset.label}
                </button>
              ))}
            </div>

            {/* IDLE Shell Logs Container */}
            <div className="flex-1 p-4 font-mono text-xs overflow-auto leading-relaxed select-text space-y-2 scrollbar-thin bg-[#020203]">
              {idleLogs.map((log) => {
                if (log.type === 'banner') {
                  return (
                    <div key={log.id} className="text-emerald-400/90 whitespace-pre-wrap font-semibold pb-2 border-b border-emerald-900/30 leading-normal">
                      {log.text}
                    </div>
                  );
                }
                if (log.type === 'cmd') {
                  return (
                    <div key={log.id} className="text-cyan-300 font-bold whitespace-pre-wrap pt-1">
                      {log.text}
                    </div>
                  );
                }
                if (log.type === 'err') {
                  return (
                    <div key={log.id} className="text-red-400 whitespace-pre-wrap pl-3 border-l-2 border-red-500/60 my-1 bg-red-950/20 py-1">
                      {log.text}
                    </div>
                  );
                }
                return (
                  <div key={log.id} className="text-blue-300/90 whitespace-pre-wrap pl-3 font-semibold">
                    {log.text}
                  </div>
                );
              })}

              {isIdleRunning && (
                <div className="flex items-center gap-2 text-emerald-400 animate-pulse text-xs py-1">
                  <Sparkles className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                  <span>Evaluating Python IDLE expression...</span>
                </div>
              )}
              <div ref={idleConsoleEndRef} />
            </div>

            {/* Interactive Prompt Input */}
            <form
              onSubmit={handleIdleSubmit}
              className="flex items-center gap-3 border-t border-white/10 bg-[#07070a] px-4 py-3 shadow-lg"
            >
              <span className="text-emerald-400 font-mono font-bold text-sm select-none">&gt;&gt;&gt;</span>
              <input
                type="text"
                value={idleInput}
                onChange={(e) => setIdleInput(e.target.value)}
                onKeyDown={handleIdleKeyDown}
                placeholder="Type Python code (e.g. x = 10, print(x*2), import sys) [Enter]"
                disabled={isIdleRunning}
                className="flex-1 bg-transparent font-mono text-xs text-gray-100 placeholder-gray-500 focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                disabled={!idleInput.trim() || isIdleRunning}
                className="rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 py-1.5 text-xs font-bold text-white shadow-md hover:brightness-110 disabled:opacity-40 transition-all flex items-center gap-1.5"
              >
                <CornerDownLeft className="h-3.5 w-3.5" />
                <span>Execute</span>
              </button>
            </form>
          </div>

          {/* Interactive Variables & Environment Panel */}
          <div className="w-full md:w-72 bg-[#060608] border-t md:border-t-0 md:border-l border-white/5 p-4 flex flex-col gap-3 font-mono text-xs overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="font-bold text-gray-200 flex items-center gap-1.5">
                <Code2 className="h-4 w-4 text-emerald-400" />
                <span>Variable Inspector</span>
              </span>
              <button
                onClick={refreshIdleVars}
                className="p-1 rounded text-gray-400 hover:text-emerald-300 hover:bg-white/5 transition-colors"
                title="Refresh variables list"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            </div>

            {idleVariables.length === 0 ? (
              <div className="text-gray-500 text-[11px] leading-relaxed italic bg-[#030304] p-3 rounded-xl border border-white/5 text-center">
                No custom variables defined yet. Execute commands like <code>x = 42</code> to inspect them here.
              </div>
            ) : (
              <div className="space-y-2">
                {idleVariables.map((v, i) => (
                  <div key={i} className="p-2.5 rounded-xl border border-white/5 bg-[#030304] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-300">{v.name}</span>
                      <span className="text-[10px] text-gray-400 bg-white/5 px-1.5 py-0.5 rounded">{v.type}</span>
                    </div>
                    <div className="text-gray-300 text-[11px] break-all font-mono bg-[#010102] p-1.5 rounded border border-white/5">
                      {v.value}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Switch Button back to Script Mode */}
            <div className="mt-auto pt-4 border-t border-white/5">
              <button
                onClick={() => setWorkspaceMode('script')}
                className="w-full py-2 px-3 rounded-xl border border-blue-500/30 bg-blue-950/40 text-blue-300 hover:bg-blue-900/60 font-semibold text-xs transition-all flex items-center justify-center gap-2"
              >
                <Code2 className="h-4 w-4" />
                <span>Switch to Script Editor (.py)</span>
              </button>
            </div>
          </div>

        </div>
      ) : (
        /* SCRIPT MODE (.py FILE EDITOR) VIEW */
        <div className="flex-1 flex flex-col md:flex-row min-h-0 relative">
          
          {/* Monaco Editor Container */}
          <div className="flex-1 min-h-0 bg-[#050505] relative flex flex-col">

            {/* File Tabs Bar */}
            <div className="flex items-center gap-1 bg-[#06080e] border-b border-slate-800/80 px-2 pt-1.5 overflow-x-auto scrollbar-none select-none">
              {scriptTabs.map((tab) => {
                const isActive = tab.id === activeTabId;
                return (
                  <div
                    key={tab.id}
                    onClick={() => handleSelectScriptTab(tab.id)}
                    className={`group flex items-center gap-2 px-3 py-1.5 rounded-t-lg text-xs font-mono font-bold cursor-pointer transition-all border-t border-x ${
                      isActive
                        ? 'bg-[#0a0c12] text-amber-300 border-slate-700 shadow-sm border-b-transparent'
                        : 'bg-[#0b0e17] text-slate-400 hover:text-slate-200 border-slate-800/60 hover:bg-[#0f121d]'
                    }`}
                  >
                    <FileText className={`h-3.5 w-3.5 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                    <span>{tab.title}</span>

                    {scriptTabs.length > 1 && (
                      <button
                        onClick={(e) => handleCloseScriptTab(tab.id, e)}
                        className="p-0.5 rounded hover:bg-white/10 text-slate-500 hover:text-red-400 transition-colors"
                        title="Close Tab"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Add New File Tab Button */}
              <button
                onClick={handleAddNewScriptTab}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-t-lg bg-[#0a0c12] hover:bg-[#121522] border border-slate-800 text-slate-400 hover:text-amber-300 text-xs font-bold transition-all ml-1"
                title="Open New Python Module Tab"
              >
                <Plus className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">New Tab</span>
              </button>
            </div>
            
            {/* Clean Coder Helper Bar */}
            <div className="flex items-center justify-between border-b border-slate-800 bg-[#0a0c12] px-3 py-1.5 text-xs font-mono select-none flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {/* Tab Indentation Quick Controls */}
                <div className="flex items-center gap-1 bg-[#131622] px-1.5 py-0.5 rounded-lg border border-slate-800">
                  <button
                    onClick={handleOutdentTab}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/10 text-slate-300 hover:text-amber-300 transition-colors"
                    title="Outdent Line / Selection (Shift + Tab)"
                  >
                    <Outdent className="h-3 w-3 text-amber-400" />
                    <span className="text-[10px] font-bold">Shift+Tab</span>
                  </button>
                  <div className="h-3 w-[1px] bg-slate-800" />
                  <button
                    onClick={handleIndentTab}
                    className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/10 text-slate-300 hover:text-amber-300 transition-colors"
                    title="Indent Line / Selection (Tab)"
                  >
                    <Indent className="h-3 w-3 text-amber-400" />
                    <span className="text-[10px] font-bold">Tab</span>
                  </button>
                </div>

                <button
                  onClick={() => setShowSnippetsModal(true)}
                  className="flex items-center gap-1.5 btn-3d-dark rounded-lg px-2.5 py-1 text-xs font-bold text-amber-300 hover:text-amber-200"
                  title="Open Python Snippets Library for 1-click code insertion"
                >
                  <FileCode className="h-3.5 w-3.5 text-amber-400" />
                  <span>Snippets</span>
                </button>

                <button
                  onClick={() => setShowPackagesModal(true)}
                  className="flex items-center gap-1.5 btn-3d-dark rounded-lg px-2.5 py-1 text-xs font-bold text-slate-300 hover:text-emerald-300"
                  title="Install PyPI packages dynamically via Pyodide micropip"
                >
                  <Package className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Packages</span>
                </button>

                <button
                  onClick={() => setShowShortcutsModal(true)}
                  className="flex items-center gap-1.5 btn-3d-dark rounded-lg px-2.5 py-1 text-xs font-bold text-slate-300 hover:text-blue-300"
                  title="View keyboard hotkeys cheat sheet"
                >
                  <Keyboard className="h-3.5 w-3.5 text-blue-400" />
                  <span>Shortcuts</span>
                </button>
              </div>

              {/* Editor Preferences: Font Size, Word Wrap, Minimap, Tab Size */}
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                {/* Tab Size Selector */}
                <button
                  onClick={() => setTabSize((prev) => (prev === 4 ? 2 : 4))}
                  className="px-2 py-1 rounded-lg bg-[#131622] border border-slate-800 font-bold text-amber-300 hover:border-amber-500/40 transition-all"
                  title="Toggle Tab Indent Size (4 spaces PEP 8 vs 2 spaces)"
                >
                  Spaces: {tabSize}
                </button>

                {/* Font Size Adjuster */}
                <div className="flex items-center gap-1 bg-[#131622] px-2 py-0.5 rounded-lg border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 mr-0.5">Size:</span>
                  <button
                    onClick={() => setFontSize((prev) => Math.max(10, prev - 1))}
                    className="p-0.5 hover:text-amber-300 transition-colors"
                    title="Decrease Editor Font Size"
                  >
                    <ZoomOut className="h-3 w-3" />
                  </button>
                  <span className="font-extrabold text-amber-300 px-1 min-w-[20px] text-center">{fontSize}px</span>
                  <button
                    onClick={() => setFontSize((prev) => Math.min(24, prev + 1))}
                    className="p-0.5 hover:text-amber-300 transition-colors"
                    title="Increase Editor Font Size"
                  >
                    <ZoomIn className="h-3 w-3" />
                  </button>
                </div>

                {/* Word Wrap Toggle */}
                <button
                  onClick={() => setWordWrap((prev) => (prev === 'on' ? 'off' : 'on'))}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all ${
                    wordWrap === 'on'
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold'
                      : 'bg-[#131622] border-slate-800 text-slate-400'
                  }`}
                  title="Toggle Word Wrap"
                >
                  <WrapText className="h-3 w-3" />
                  <span>Wrap</span>
                </button>

                {/* Minimap Toggle */}
                <button
                  onClick={() => setShowMinimap((prev) => !prev)}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all ${
                    showMinimap
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold'
                      : 'bg-[#131622] border-slate-800 text-slate-400'
                  }`}
                  title="Toggle Editor Minimap"
                >
                  <Layers className="h-3 w-3" />
                  <span>Map</span>
                </button>
              </div>
            </div>

            {isFormattedToast && (
              <div className="absolute top-10 right-6 z-20 flex items-center gap-1.5 rounded-xl border border-amber-500/40 bg-[#121520] px-3 py-1.5 text-xs text-amber-300 shadow-xl animate-fade-in font-mono">
                <Wand2 className="h-3.5 w-3.5 text-amber-400" />
                <span>Python Code Formatted (PEP 8)</span>
              </div>
            )}

            <div className="flex-1 min-h-0">
              <Editor
                height="100%"
                defaultLanguage="python"
                theme={editorTheme}
                value={code}
                onChange={handleCodeChange}
                onMount={handleEditorDidMount}
                options={{
                  readOnly: !isOwner,
                  fontSize: fontSize,
                  wordWrap: wordWrap,
                  glyphMargin: true,
                  minimap: { enabled: showMinimap },
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  tabSize: tabSize,
                  fontFamily: "'Fira Code', 'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
                  fontLigatures: true,
                  cursorBlinking: 'smooth',
                  cursorSmoothCaretAnimation: 'on',
                  renderLineHighlight: 'all',
                  bracketPairColorization: { enabled: true },
                guides: { indentation: true, bracketPairs: true },
                smoothScrolling: true,
                formatOnType: true,
                formatOnPaste: true,
                autoClosingBrackets: 'always',
                autoClosingQuotes: 'always',
                suggestOnTriggerCharacters: true,
                acceptSuggestionOnEnter: 'on',
                padding: { top: 12, bottom: 12 },
                lineNumbersMinChars: 3,
              }}
            />
            </div>
          </div>

          {/* Console / Terminal Drawer */}
          <div
            className={`border-t md:border-t-0 md:border-l border-white/5 bg-[#050505] flex flex-col transition-all duration-300 ${
              isConsoleExpanded ? 'h-80 md:h-auto md:w-[450px]' : 'h-10 md:h-auto md:w-12'
            }`}
          >
            {/* Console Header Bar with Tabs */}
            <div
              className="flex items-center justify-between border-b border-white/5 bg-[#08080a] px-3 py-1.5 select-none text-xs font-mono"
            >
              {/* Tab Switcher */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setConsoleTab('terminal');
                    if (!isConsoleExpanded) setIsConsoleExpanded(true);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    consoleTab === 'terminal'
                      ? 'bg-blue-950/80 text-blue-300 border border-blue-500/40 shadow-sm'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }`}
                  title="Program Output Log"
                >
                  <TerminalIcon className="h-3.5 w-3.5 text-blue-400" />
                  <span>Program Output</span>
                  {executionResult.status === 'success' && (
                    <span className="text-[10px] text-blue-400 bg-blue-950/80 border border-blue-800/60 px-1 rounded">
                      {executionResult.executionTimeMs}ms
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    setConsoleTab('idle');
                    if (!isConsoleExpanded) setIsConsoleExpanded(true);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    consoleTab === 'idle'
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }`}
                  title="Interactive Python IDLE REPL Shell"
                >
                  <Cpu className="h-3.5 w-3.5 text-emerald-400" />
                  <span>IDLE REPL</span>
                </button>

                <button
                  onClick={() => {
                    setConsoleTab('debug');
                    if (!isConsoleExpanded) setIsConsoleExpanded(true);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    consoleTab === 'debug'
                      ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                  }`}
                  title="Step-by-Step Python Debugger & Variables"
                >
                  <Bug className="h-3.5 w-3.5 text-amber-400" />
                  <span>Debugger & Variables</span>
                  {debugBreakpoints.length > 0 && (
                    <span className="text-[10px] text-red-300 bg-red-950/80 border border-red-800/60 px-1 rounded font-bold">
                      {debugBreakpoints.length} BP
                    </span>
                  )}
                </button>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-1">
                {consoleTab === 'idle' ? (
                  <>
                    <button
                      onClick={handleResetIdle}
                      className="rounded p-1 text-gray-400 hover:text-emerald-300 hover:bg-white/5 transition-colors"
                      title="Reset IDLE Python REPL Namespace"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() =>
                        setIdleLogs([{ id: 'banner', type: 'banner', text: IDLE_WELCOME_BANNER }])
                      }
                      className="rounded p-1 text-gray-400 hover:text-red-300 hover:bg-white/5 transition-colors"
                      title="Clear IDLE Shell Screen"
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() =>
                      setExecutionResult({ output: '', error: null, executionTimeMs: 0, status: 'idle' })
                    }
                    className="rounded p-1 text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors"
                    title="Clear program output"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}

                <button
                  onClick={() => setIsConsoleExpanded(!isConsoleExpanded)}
                  className="rounded p-1 text-gray-400 hover:text-gray-200 transition-colors"
                >
                  {isConsoleExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Console Content Area */}
            {isConsoleExpanded && (
              <div className="flex-1 flex flex-col min-h-0 bg-[#030303] overflow-hidden">
                
                {/* TAB 1: SCRIPT PROGRAM OUTPUT */}
                {consoleTab === 'terminal' && (
                  <div className="flex-1 p-3 font-mono text-xs overflow-auto leading-relaxed select-text bg-[#030303]">
                    {executionResult.status === 'running' && (
                      <div className="flex items-center gap-2 text-emerald-400 animate-pulse">
                        <Sparkles className="h-4 w-4 animate-spin" />
                        <span>Running Python IDLE script...</span>
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

                {/* TAB 3: STEP-BY-STEP DEBUGGER & VARIABLE INSPECTOR */}
                {consoleTab === 'debug' && (
                  <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-[#030303] divide-y md:divide-y-0 md:divide-x divide-white/5 overflow-auto">
                    
                    {/* Left: Variable Inspector */}
                    <div className="flex-1 p-3 flex flex-col min-h-0 font-mono text-xs">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                        <span className="font-bold text-amber-300 flex items-center gap-1.5">
                          <Variable className="h-4 w-4 text-amber-400" />
                          <span>Scope Variables</span>
                          {isDebugPaused && debugCurrentLine && (
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40">
                              Paused @ Line {debugCurrentLine}
                            </span>
                          )}
                        </span>

                        {/* Quick Debugger Controls */}
                        {isDebugActive && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={handleDebugStepOver}
                              disabled={!isDebugPaused}
                              className="px-2 py-1 rounded bg-blue-600 text-white font-bold text-[11px] hover:bg-blue-500 disabled:opacity-40 transition-all flex items-center gap-1"
                            >
                              <StepForward className="h-3 w-3" />
                              <span>Step Over</span>
                            </button>
                            <button
                              onClick={handleDebugContinue}
                              disabled={!isDebugPaused}
                              className="px-2 py-1 rounded bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-500 disabled:opacity-40 transition-all flex items-center gap-1"
                            >
                              <Play className="h-3 w-3 fill-current" />
                              <span>Continue</span>
                            </button>
                          </div>
                        )}
                      </div>

                      {debugVariables.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-gray-500">
                          <Bug className="h-8 w-8 text-gray-600 mb-2 opacity-50" />
                          <p className="text-xs">
                            {isDebugActive
                              ? 'No user variables defined at this breakpoint yet.'
                              : 'Click "Debug Script" above or set breakpoints in the editor margin to step line-by-line.'}
                          </p>
                        </div>
                      ) : (
                        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                          {debugVariables.map((v, i) => (
                            <div
                              key={i}
                              className="flex items-center justify-between p-2 rounded-lg bg-[#08080c] border border-white/5 hover:border-amber-500/30 transition-all"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="font-bold text-amber-300 shrink-0">{v.name}</span>
                                <span className="text-[10px] text-gray-400 bg-white/5 px-1.5 py-0.5 rounded shrink-0">
                                  {v.type}
                                </span>
                              </div>
                              <span className="font-mono text-gray-200 text-xs truncate max-w-[200px] bg-[#020203] px-2 py-0.5 rounded border border-white/5">
                                {v.value}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right: Breakpoints Panel */}
                    <div className="w-full md:w-64 p-3 flex flex-col min-h-0 font-mono text-xs bg-[#050508]">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                        <span className="font-bold text-gray-200 flex items-center gap-1.5">
                          <CircleDot className="h-4 w-4 text-red-500" />
                          <span>Active Breakpoints</span>
                        </span>
                        {debugBreakpoints.length > 0 && (
                          <button
                            onClick={() => {
                              setDebugBreakpointsState([]);
                              setDebugBreakpoints([]);
                            }}
                            className="text-[10px] text-gray-400 hover:text-red-400 transition-colors"
                          >
                            Clear All
                          </button>
                        )}
                      </div>

                      {debugBreakpoints.length === 0 ? (
                        <div className="text-gray-500 text-[11px] italic text-center p-3">
                          Click any line number in the code editor gutter to set breakpoints.
                        </div>
                      ) : (
                        <div className="space-y-1.5 overflow-y-auto flex-1">
                          {debugBreakpoints.map((line) => (
                            <div
                              key={line}
                              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border transition-all ${
                                debugCurrentLine === line
                                  ? 'bg-amber-950/60 border-amber-500/60 text-amber-200 font-bold'
                                  : 'bg-[#0a0a0f] border-white/5 text-gray-300 hover:border-red-500/30'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-red-500 shadow-sm shadow-red-500"></span>
                                <span>Line {line}</span>
                              </div>
                              <button
                                onClick={() => toggleBreakpoint(line)}
                                className="text-gray-500 hover:text-red-400 p-0.5 rounded transition-colors"
                                title="Remove breakpoint"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                )}
                {consoleTab === 'idle' && (
                  <div className="flex-1 flex flex-col min-h-0">
                    {/* IDLE Log Output Container */}
                    <div className="flex-1 p-3 font-mono text-xs overflow-auto leading-relaxed select-text space-y-1.5 scrollbar-thin">
                      {idleLogs.map((log) => {
                        if (log.type === 'banner') {
                          return (
                            <div key={log.id} className="text-emerald-400/90 whitespace-pre-wrap font-semibold pb-1 border-b border-emerald-900/30">
                              {log.text}
                            </div>
                          );
                        }
                        if (log.type === 'cmd') {
                          return (
                            <div key={log.id} className="text-cyan-300 font-bold whitespace-pre-wrap pt-1">
                              {log.text}
                            </div>
                          );
                        }
                        if (log.type === 'err') {
                          return (
                            <div key={log.id} className="text-red-400 whitespace-pre-wrap pl-2 border-l-2 border-red-500/50">
                              {log.text}
                            </div>
                          );
                        }
                        return (
                          <div key={log.id} className="text-blue-300/90 whitespace-pre-wrap pl-2">
                            {log.text}
                          </div>
                        );
                      })}

                      {isIdleRunning && (
                        <div className="flex items-center gap-2 text-emerald-400 animate-pulse text-xs py-1">
                          <Sparkles className="h-3.5 w-3.5 animate-spin" />
                          <span>Evaluating in Python IDLE CPython engine...</span>
                        </div>
                      )}
                      <div ref={idleConsoleEndRef} />
                    </div>

                    {/* IDLE Input Prompt Form */}
                    <form
                      onSubmit={handleIdleSubmit}
                      className="flex items-center gap-2 border-t border-white/5 bg-[#08080a] px-3 py-2"
                    >
                      <span className="text-emerald-400 font-mono font-bold text-xs select-none">&gt;&gt;&gt;</span>
                      <input
                        type="text"
                        value={idleInput}
                        onChange={(e) => setIdleInput(e.target.value)}
                        onKeyDown={handleIdleKeyDown}
                        placeholder="Type Python code (e.g., 2+2, import numpy, help()) [Enter]"
                        disabled={isIdleRunning}
                        className="flex-1 bg-transparent font-mono text-xs text-gray-100 placeholder-gray-600 focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={!idleInput.trim() || isIdleRunning}
                        className="rounded-lg bg-emerald-900/60 border border-emerald-600/40 px-2 py-1 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-800/80 disabled:opacity-40 transition-all flex items-center gap-1"
                      >
                        <CornerDownLeft className="h-3 w-3" />
                        <span>Run</span>
                      </button>
                    </form>
                  </div>
                )}

              </div>
            )}
          </div>
        </div>
      )}

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

      {/* Clear All Code Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07090e]/85 p-4">
          <Card3D className="w-full max-w-sm p-5 space-y-4" hoverEffect={false}>
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-950/80 border border-red-800/80 text-red-400 shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-white">Clear All Code?</h3>
                <p className="text-xs text-slate-400">Erases all Python lines from editor</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to clear all code in <strong className="text-amber-400 font-mono">{title || 'script.py'}</strong>? You can restore it immediately using the undo banner.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="btn-3d-dark px-3.5 py-1.5 text-xs font-bold text-slate-300 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAllCode}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-500 border-b-2 border-red-900 text-white font-extrabold text-xs rounded-xl shadow active:translate-y-[1px] transition-all"
              >
                Clear All
              </button>
            </div>
          </Card3D>
        </div>
      )}

      {/* Code Snippets Modal */}
      {showSnippetsModal && (
        <CodeSnippetsModal
          onClose={() => setShowSnippetsModal(false)}
          onInsertCode={(snippetCode) =>
            handleCodeChange(code ? `${code}\n\n${snippetCode}` : snippetCode)
          }
        />
      )}

      {/* Package Manager Modal */}
      {showPackagesModal && (
        <PackageManagerModal onClose={() => setShowPackagesModal(false)} />
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcutsModal && (
        <KeyboardShortcutsModal onClose={() => setShowShortcutsModal(false)} />
      )}

    </div>
  );
};
