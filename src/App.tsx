import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { EditorWorkspace } from './components/EditorWorkspace';
import { SettingsPage } from './components/SettingsPage';
import { GitHubPagesDocs } from './components/GitHubPagesDocs';
import { AuthModal } from './components/AuthModal';
import { Project, UserProfile, ProjectPrivacy } from './types';
import {
  subscribeToAuth,
  getUserProjects,
  getProjectById,
  createProjectInDb,
  updateProjectInDb,
  deleteProjectFromDb,
  saveProjectVersion,
  logoutUser,
} from './lib/firebase';
import { PYTHON_TEMPLATES } from './lib/pyodide';

export default function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'editor' | 'docs' | 'settings'>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Default starter demo project when user has no projects
  const createDefaultStarterProject = (ownerId: string): Project => {
    return {
      id: `local-demo-${Date.now()}`,
      title: 'Python_Quickstart',
      description: 'PyCloud Workspace 3D Quickstart demo',
      code: PYTHON_TEMPLATES[0].code,
      ownerId,
      ownerEmail: user?.email || 'guest@pycloud.io',
      ownerName: user?.displayName || 'Pythonist',
      privacy: 'private',
      isShared: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  // 1. Subscribe to Auth state
  useEffect(() => {
    const unsubscribe = subscribeToAuth((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // 2. Load projects for current user & check URL share link parameters
  useEffect(() => {
    const loadWorkspace = async () => {
      setLoadingProjects(true);

      // Check if URL has a ?project=<id> share link
      const urlParams = new URLSearchParams(window.location.search);
      const sharedProjectId = urlParams.get('project');

      if (sharedProjectId) {
        try {
          const sharedProj = await getProjectById(sharedProjectId);
          if (sharedProj) {
            setActiveProject(sharedProj);
            setActiveTab('editor');
          }
        } catch (err) {
          console.error('Error loading shared project link:', err);
        }
      }

      if (user) {
        try {
          const fetchedProjects = await getUserProjects(user.uid);
          if (fetchedProjects.length === 0) {
            // Create a starter project for new user in DB
            const starter = await createProjectInDb({
              title: 'Python_Quickstart',
              description: 'PyCloud Workspace Quickstart',
              code: PYTHON_TEMPLATES[0].code,
              ownerId: user.uid,
              ownerEmail: user.email || '',
              ownerName: user.displayName || 'Pythonist',
              privacy: 'private',
              isShared: false,
            });
            setProjects([starter]);
            if (!sharedProjectId) setActiveProject(starter);
          } else {
            setProjects(fetchedProjects);
            if (!sharedProjectId && !activeProject) {
              setActiveProject(fetchedProjects[0]);
            }
          }
        } catch (err) {
          console.error('Error loading user projects:', err);
        }
      } else {
        // Fallback offline guest workspace
        const offlineStarter = createDefaultStarterProject('guest-uid');
        setProjects([offlineStarter]);
        if (!sharedProjectId && !activeProject) {
          setActiveProject(offlineStarter);
        }
      }

      setLoadingProjects(false);
    };

    loadWorkspace();
  }, [user]);

  // --- CRUD HANDLERS ---

  const handleCreateProject = async (
    title: string,
    code: string,
    privacy: ProjectPrivacy
  ) => {
    const ownerId = user?.uid || 'guest-uid';
    const ownerEmail = user?.email || 'guest@pycloud.io';
    const ownerName = user?.displayName || 'Guest User';

    if (user && !user.isAnonymous) {
      const newProj = await createProjectInDb({
        title,
        code,
        ownerId,
        ownerEmail,
        ownerName,
        privacy,
        isShared: privacy === 'shared',
      });
      setProjects((prev) => [newProj, ...prev]);
      setActiveProject(newProj);
    } else {
      const localProj: Project = {
        id: `proj-${Date.now()}`,
        title,
        code,
        ownerId,
        ownerEmail,
        ownerName,
        privacy,
        isShared: privacy === 'shared',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setProjects((prev) => [localProj, ...prev]);
      setActiveProject(localProj);
    }

    setActiveTab('editor');
  };

  const handleUpdateProjectCode = async (projectId: string, newCode: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, code: newCode, updatedAt: new Date().toISOString() } : p))
    );

    if (activeProject?.id === projectId) {
      setActiveProject((prev) => (prev ? { ...prev, code: newCode, updatedAt: new Date().toISOString() } : null));
    }

    if (user && !user.isAnonymous) {
      await updateProjectInDb(projectId, { code: newCode });
    }
  };

  const handleRenameProject = async (projectId: string, newTitle: string) => {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, title: newTitle, updatedAt: new Date().toISOString() } : p))
    );

    if (activeProject?.id === projectId) {
      setActiveProject((prev) => (prev ? { ...prev, title: newTitle, updatedAt: new Date().toISOString() } : null));
    }

    if (user && !user.isAnonymous) {
      await updateProjectInDb(projectId, { title: newTitle });
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId));

    if (activeProject?.id === projectId) {
      const remaining = projects.filter((p) => p.id !== projectId);
      setActiveProject(remaining.length > 0 ? remaining[0] : null);
    }

    if (user && !user.isAnonymous) {
      await deleteProjectFromDb(projectId);
    }
  };

  const handleTogglePrivacy = async (projectId: string, currentPrivacy: ProjectPrivacy) => {
    const nextPrivacy: ProjectPrivacy = currentPrivacy === 'private' ? 'shared' : 'private';

    setProjects((prev) =>
      prev.map((p) =>
        p.id === projectId ? { ...p, privacy: nextPrivacy, isShared: nextPrivacy === 'shared' } : p
      )
    );

    if (activeProject?.id === projectId) {
      setActiveProject((prev) =>
        prev ? { ...prev, privacy: nextPrivacy, isShared: nextPrivacy === 'shared' } : null
      );
    }

    if (user && !user.isAnonymous) {
      await updateProjectInDb(projectId, { privacy: nextPrivacy, isShared: nextPrivacy === 'shared' });
    }
  };

  const handleSaveVersionSnapshot = async (projectId: string, code: string, label?: string) => {
    if (user && !user.isAnonymous) {
      await saveProjectVersion(projectId, code, label || 'Manual Snapshot', user.displayName || 'User');
    }
  };

  // Fork shared project into current user's workspace
  const handleForkProject = async (sourceProject: Project) => {
    const forkedTitle = `${sourceProject.title}_(Fork)`;
    await handleCreateProject(forkedTitle, sourceProject.code, 'private');
  };

  // Import .py file
  const handleImportPyFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const fileCode = e.target?.result as string;
      const fileName = file.name.replace(/\.py$/i, '');
      await handleCreateProject(fileName, fileCode, 'private');
    };
    reader.readAsText(file);
  };

  const handleLogout = async () => {
    await logoutUser();
    setUser(null);
    setActiveTab('dashboard');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-gray-200 font-sans antialiased bg-mesh-pattern selection:bg-blue-500 selection:text-white">
      
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onOpenAuth={() => setShowAuthModal(true)}
        onLogout={handleLogout}
        onNewProject={() => {
          if (user) {
            handleCreateProject(`Project_${projects.length + 1}`, PYTHON_TEMPLATES[0].code, 'private');
          } else {
            setShowAuthModal(true);
          }
        }}
        hasActiveProject={!!activeProject}
        activeProjectTitle={activeProject?.title}
      />

      {/* Main Views */}
      <main>
        {activeTab === 'dashboard' && (
          <Dashboard
            projects={projects}
            onOpenProject={(proj) => {
              setActiveProject(proj);
              setActiveTab('editor');
            }}
            onCreateProject={handleCreateProject}
            onRenameProject={handleRenameProject}
            onDeleteProject={handleDeleteProject}
            onTogglePrivacy={handleTogglePrivacy}
            onImportPyFile={handleImportPyFile}
          />
        )}

        {activeTab === 'editor' && (
          activeProject ? (
            <EditorWorkspace
              project={activeProject}
              currentUser={user}
              onUpdateProjectCode={handleUpdateProjectCode}
              onRenameProject={handleRenameProject}
              onTogglePrivacy={handleTogglePrivacy}
              onSaveVersionSnapshot={handleSaveVersionSnapshot}
              onForkProject={handleForkProject}
              onDeleteProject={handleDeleteProject}
            />
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[70vh] text-center p-8 space-y-4">
              <h2 className="text-xl font-bold text-zinc-300">No Active Project Selected</h2>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-emerald-500"
              >
                Go to Dashboard
              </button>
            </div>
          )
        )}

        {activeTab === 'docs' && <GitHubPagesDocs />}

        {activeTab === 'settings' && (
          <SettingsPage
            user={user}
            onLogout={handleLogout}
            onOpenAuth={() => setShowAuthModal(true)}
          />
        )}
      </main>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={() => setActiveTab('dashboard')}
        />
      )}

    </div>
  );
}
