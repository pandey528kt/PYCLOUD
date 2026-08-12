import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  FileCode2,
  Upload,
  Lock,
  Share2,
  Trash2,
  Edit2,
  ExternalLink,
  Code2,
  Clock,
  Sparkles,
  Layers,
  FolderPlus,
  AlertTriangle,
  X,
  Check,
} from 'lucide-react';
import { Card3D } from './3d/Card3D';
import { Project, ProjectPrivacy } from '../types';
import { PYTHON_TEMPLATES } from '../lib/pyodide';

interface DashboardProps {
  projects: Project[];
  onOpenProject: (project: Project) => void;
  onCreateProject: (title: string, code: string, privacy: ProjectPrivacy) => Promise<void>;
  onRenameProject: (projectId: string, newTitle: string) => Promise<void>;
  onDeleteProject: (projectId: string) => Promise<void>;
  onTogglePrivacy: (projectId: string, currentPrivacy: ProjectPrivacy) => Promise<void>;
  onImportPyFile: (file: File) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  projects,
  onOpenProject,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onTogglePrivacy,
  onImportPyFile,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPrivacy, setFilterPrivacy] = useState<'all' | 'private' | 'shared'>('all');
  
  // Modal States
  const [showNewModal, setShowNewModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('hello_world');
  const [newPrivacy, setNewPrivacy] = useState<ProjectPrivacy>('private');
  const [isCreating, setIsCreating] = useState(false);

  // Delete Confirmation Modal
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Rename Modal
  const [renamingProject, setRenamingProject] = useState<Project | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      const matchesSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        p.code.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesPrivacy =
        filterPrivacy === 'all'
          ? true
          : filterPrivacy === 'private'
          ? p.privacy === 'private'
          : p.privacy === 'shared' || p.isShared;

      return matchesSearch && matchesPrivacy;
    });
  }, [projects, searchQuery, filterPrivacy]);

  // Handle New Project creation
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsCreating(true);
    try {
      const template = PYTHON_TEMPLATES.find((t) => t.id === selectedTemplateId);
      const codeToUse = template ? template.code : `# ${newTitle}\nprint("Hello from PyCloud Workspace!")\n`;
      await onCreateProject(newTitle.trim(), codeToUse, newPrivacy);
      setShowNewModal(false);
      setNewTitle('');
    } catch (err) {
      console.error('Error creating project:', err);
    } finally {
      setIsCreating(false);
    }
  };

  // Handle Rename submission
  const handleRenameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamingProject || !renameTitle.trim()) return;

    setIsRenaming(true);
    try {
      await onRenameProject(renamingProject.id, renameTitle.trim());
      setRenamingProject(null);
    } catch (err) {
      console.error('Error renaming project:', err);
    } finally {
      setIsRenaming(false);
    }
  };

  // Handle Delete confirmation
  const handleConfirmDelete = async () => {
    if (!deletingProject) return;
    setIsDeleting(true);
    try {
      await onDeleteProject(deletingProject.id);
      setDeletingProject(null);
    } catch (err) {
      console.error('Error deleting project:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle File Drag & Drop / Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onImportPyFile(files[0]);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 space-y-8">
      
      {/* Hero / Stats Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#121520] p-6 md:p-8 shadow-[0_16px_40px_rgba(0,0,0,0.8),_inset_0_1px_0_rgba(255,255,255,0.1)]">
        {/* Top Rim Bevel */}
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs text-amber-300 font-mono font-bold shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
              <span>3D Tactile Cloud IDE • Pyodide WASM Engine</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              Python Cloud Workspace
            </h1>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Build, run, debug, and sync Python applications in a high-performance 3D environment. Powered by client-side WebAssembly execution and cloud persistence.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button
              onClick={() => setShowNewModal(true)}
              className="flex-1 lg:flex-initial flex items-center justify-center gap-2 btn-3d-gold rounded-xl px-5 py-3 text-xs font-extrabold text-white shadow-lg"
            >
              <Plus className="h-4 w-4" />
              <span>New Python Script</span>
            </button>

            <label className="flex-1 lg:flex-initial flex items-center justify-center gap-2 btn-3d-dark rounded-xl px-4 py-3 text-xs font-bold text-slate-200 cursor-pointer shadow-md">
              <Upload className="h-4 w-4 text-amber-400" />
              <span>Import .py File</span>
              <input
                type="file"
                accept=".py"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Workspace Quick Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800">
          <div className="rounded-xl border border-slate-800/90 bg-[#0a0c12] p-3.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
            <p className="text-[11px] font-mono text-slate-400 uppercase font-bold">Total Projects</p>
            <p className="text-2xl font-extrabold text-white mt-1">{projects.length}</p>
          </div>
          <div className="rounded-xl border border-slate-800/90 bg-[#0a0c12] p-3.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
            <p className="text-[11px] font-mono text-slate-400 uppercase font-bold">Private Code</p>
            <p className="text-2xl font-extrabold text-amber-400 mt-1">
              {projects.filter((p) => p.privacy === 'private').length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800/90 bg-[#0a0c12] p-3.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
            <p className="text-[11px] font-mono text-slate-400 uppercase font-bold">Shared Links</p>
            <p className="text-2xl font-extrabold text-blue-400 mt-1">
              {projects.filter((p) => p.privacy === 'shared' || p.isShared).length}
            </p>
          </div>
          <div className="rounded-xl border border-slate-800/90 bg-[#0a0c12] p-3.5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
            <p className="text-[11px] font-mono text-slate-400 uppercase font-bold">Total Lines</p>
            <p className="text-2xl font-extrabold text-slate-200 mt-1">
              {projects.reduce((acc, p) => acc + p.code.split('\n').length, 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search projects by name, code, keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full input-3d rounded-xl pl-10 pr-8 py-2.5 text-xs text-slate-200 placeholder-slate-500 font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Privacy Segment Filter */}
        <div className="flex items-center rounded-xl border border-slate-800 bg-[#080a10] p-1 w-full sm:w-auto shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
          <button
            onClick={() => setFilterPrivacy('all')}
            className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              filterPrivacy === 'all'
                ? 'btn-3d-gold text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({projects.length})
          </button>
          <button
            onClick={() => setFilterPrivacy('private')}
            className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              filterPrivacy === 'private'
                ? 'btn-3d-gold text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Private
          </button>
          <button
            onClick={() => setFilterPrivacy('shared')}
            className={`flex-1 sm:flex-initial px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              filterPrivacy === 'shared'
                ? 'btn-3d-gold text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Shared
          </button>
        </div>
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <Card3D className="p-12 text-center" hoverEffect={false}>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800/80 border border-zinc-700 text-zinc-400 mb-4 shadow-lg">
            <FileCode2 className="h-8 w-8 text-emerald-400" />
          </div>
          <h3 className="text-lg font-bold text-zinc-200">No Python Projects Found</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1 mb-6">
            {searchQuery
              ? `No projects matching "${searchQuery}". Try clearing your search filter.`
              : 'Start your cloud Python workspace by creating a new project or importing an existing script.'}
          </p>
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg hover:bg-emerald-500 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Create First Project</span>
          </button>
        </Card3D>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => {
            const lineCount = project.code.split('\n').length;
            const isShared = project.privacy === 'shared' || project.isShared;

            return (
              <Card3D
                key={project.id}
                onClick={() => onOpenProject(project)}
                className="group flex flex-col justify-between p-5 space-y-4"
              >
                {/* Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-500/30 bg-blue-950/50 text-blue-400 shadow">
                        <Code2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-gray-100 truncate group-hover:text-blue-400 transition-colors">
                          {project.title}
                        </h3>
                        <p className="text-[11px] font-mono text-gray-400">
                          {lineCount} {lineCount === 1 ? 'line' : 'lines'} • {project.code.length} chars
                        </p>
                      </div>
                    </div>

                    {/* Privacy Badge Toggle */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePrivacy(project.id, project.privacy);
                      }}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium border transition-all ${
                        isShared
                          ? 'border-indigo-500/40 bg-indigo-950/60 text-indigo-300 hover:border-indigo-400'
                          : 'border-white/10 bg-[#0a0a0d] text-gray-400 hover:border-white/20'
                      }`}
                      title="Click to toggle Private/Shared privacy"
                    >
                      {isShared ? (
                        <>
                          <Share2 className="h-3 w-3" />
                          <span>Shared</span>
                        </>
                      ) : (
                        <>
                          <Lock className="h-3 w-3" />
                          <span>Private</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Code snippet preview */}
                  <div className="rounded-xl border border-white/5 bg-[#050505] p-2.5 font-mono text-[11px] text-gray-400 overflow-hidden line-clamp-3 h-16 leading-relaxed select-none">
                    {project.code}
                  </div>
                </div>

                {/* Footer Meta & Actions */}
                <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs text-gray-400">
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <Clock className="h-3 w-3 text-gray-500" />
                    <span>
                      {new Date(project.updatedAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenamingProject(project);
                        setRenameTitle(project.title);
                      }}
                      className="rounded-lg p-1.5 text-gray-400 hover:text-gray-200 hover:bg-white/5 transition-colors"
                      title="Rename"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingProject(project);
                      }}
                      className="rounded-lg p-1.5 text-gray-400 hover:text-red-400 hover:bg-white/5 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenProject(project);
                      }}
                      className="flex items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-950/40 px-2.5 py-1 text-[11px] font-medium text-blue-400 hover:bg-blue-900/60 transition-colors ml-1"
                    >
                      <span>Open</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </Card3D>
            );
          })}
        </div>
      )}

      {/* Modal: New Project */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <Card3D className="w-full max-w-lg p-6 space-y-6" hoverEffect={false}>
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-zinc-100">Create New Python Project</h2>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Project Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Data_Analyzer_v1"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-200 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Starter Template
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {PYTHON_TEMPLATES.map((tmpl) => (
                    <div
                      key={tmpl.id}
                      onClick={() => setSelectedTemplateId(tmpl.id)}
                      className={`cursor-pointer rounded-xl border p-3 text-left transition-all ${
                        selectedTemplateId === tmpl.id
                          ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 shadow'
                          : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <p className="text-xs font-bold text-zinc-200">{tmpl.title}</p>
                      <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-2">
                        {tmpl.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Privacy Settings
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewPrivacy('private')}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-medium transition-all ${
                      newPrivacy === 'private'
                        ? 'border-emerald-500 bg-emerald-950/60 text-emerald-300'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <Lock className="h-4 w-4" />
                    <span>Private</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPrivacy('shared')}
                    className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-medium transition-all ${
                      newPrivacy === 'shared'
                        ? 'border-teal-500 bg-teal-950/60 text-teal-300'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <Share2 className="h-4 w-4" />
                    <span>Shared Link</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-lg hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </Card3D>
        </div>
      )}

      {/* Modal: Rename */}
      {renamingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <Card3D className="w-full max-w-md p-6 space-y-4" hoverEffect={false}>
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-zinc-100">Rename Project</h3>
              <button
                onClick={() => setRenamingProject(null)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleRenameSubmit} className="space-y-4">
              <input
                type="text"
                required
                value={renameTitle}
                onChange={(e) => setRenameTitle(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-200 focus:border-emerald-500 focus:outline-none"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRenamingProject(null)}
                  className="rounded-lg px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRenaming}
                  className="rounded-lg border border-emerald-500/40 bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  {isRenaming ? 'Saving...' : 'Save Title'}
                </button>
              </div>
            </form>
          </Card3D>
        </div>
      )}

      {/* Modal: Delete Confirmation */}
      {deletingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <Card3D className="w-full max-w-md p-6 space-y-4 border-red-900/50" hoverEffect={false}>
            <div className="flex items-center gap-3 text-red-400">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-950/80 border border-red-800/60">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-100">Delete Project?</h3>
                <p className="text-xs text-zinc-400 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 bg-zinc-950 p-3 rounded-xl border border-zinc-800 font-mono">
              Project: <span className="text-red-400 font-bold">{deletingProject.title}</span>
            </p>

            <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setDeletingProject(null)}
                className="rounded-xl px-4 py-2 text-xs font-medium text-zinc-400 hover:text-zinc-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex items-center gap-1.5 rounded-xl border border-red-500/50 bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-red-500 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Forever'}</span>
              </button>
            </div>
          </Card3D>
        </div>
      )}

    </div>
  );
};
