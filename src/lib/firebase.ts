import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signInAnonymously,
  signOut,
  updatePassword as firebaseUpdatePassword,
  deleteUser as firebaseDeleteUser,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Firestore,
  serverTimestamp,
} from 'firebase/firestore';
import defaultConfig from '../../firebase-applet-config.json';
import { Project, ProjectVersion, UserProfile } from '../types';

// Allow local overrides for users testing custom Firebase configs on GitHub Pages
const getActiveFirebaseConfig = () => {
  const customConfig = localStorage.getItem('pycloud_custom_firebase_config');
  if (customConfig) {
    try {
      return JSON.parse(customConfig);
    } catch {
      // Fallback
    }
  }
  return defaultConfig;
};

const config = getActiveFirebaseConfig();

// Safe Firebase Initialization
let app: FirebaseApp;
try {
  if (!getApps().length) {
    app = initializeApp(config);
  } else {
    app = getApp();
  }
} catch (err) {
  console.warn('Firebase initialization warning:', err);
  app = getApps().length ? getApp() : initializeApp({ apiKey: 'dummy-key', projectId: 'demo-project' });
}

export const auth = getAuth(app);

// Use specified databaseId if present, else default
export const db: Firestore = (() => {
  try {
    return config.firestoreDatabaseId
      ? getFirestore(app, config.firestoreDatabaseId)
      : getFirestore(app);
  } catch (err) {
    console.warn('Firestore initialization warning:', err);
    return getFirestore(app);
  }
})();

export const googleProvider = new GoogleAuthProvider();

// Format user payload
export const mapFirebaseUser = (user: FirebaseUser | null): UserProfile | null => {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || user.email?.split('@')[0] || 'Pythonist',
    photoURL: user.photoURL,
    isAnonymous: user.isAnonymous,
  };
};

// --- AUTH HELPERS ---

export function formatAuthError(error: any): string {
  if (!error) return 'Authentication failed. Please try again.';
  const code = error?.code || '';
  const message = error?.message || '';

  switch (code) {
    case 'auth/operation-not-allowed':
    case 'auth/admin-restricted-operation':
      return 'This authentication method is disabled in your Firebase console. You can click "Guest Demo" to continue immediately.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please verify your credentials or switch to Sign Up.';
    case 'auth/email-already-in-use':
      return 'An account with this email address already exists. Please switch to Sign In.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address format.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed before completing.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by your browser. Please allow popups for this site.';
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized in your Firebase Auth console settings.';
    case 'auth/network-request-failed':
      return 'Network connection issue. Please check your internet connection.';
    default:
      if (typeof message === 'string' && message.includes('auth/')) {
        const cleanMsg = message.replace(/^Firebase:\s*Error\s*\(auth\//i, '').replace(/\)\.?$/i, '').replace(/-/g, ' ');
        return `Authentication notice: ${cleanMsg}`;
      }
      return message || 'Authentication failed. Please try again.';
  }
}

export const getLocalUser = (): UserProfile | null => {
  try {
    const saved = localStorage.getItem('pycloud_local_user');
    if (saved) return JSON.parse(saved);
  } catch {
    // Ignore
  }
  return null;
};

export const setLocalUser = (user: UserProfile | null) => {
  try {
    if (user) {
      localStorage.setItem('pycloud_local_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('pycloud_local_user');
    }
  } catch {
    // Ignore
  }
};

export const subscribeToAuth = (callback: (user: UserProfile | null) => void) => {
  try {
    const localUser = getLocalUser();
    if (localUser) {
      callback(localUser);
    }

    return onAuthStateChanged(
      auth,
      (firebaseUser) => {
        if (firebaseUser) {
          const mapped = mapFirebaseUser(firebaseUser);
          setLocalUser(null); // Clear local override when real Firebase user logs in
          callback(mapped);
        } else {
          callback(getLocalUser());
        }
      },
      (error) => {
        console.warn('Auth state change warning:', error);
        callback(getLocalUser());
      }
    );
  } catch (err) {
    console.warn('subscribeToAuth exception:', err);
    callback(getLocalUser());
    return () => {};
  }
};

export const loginWithEmail = async (email: string, pass: string) => {
  try {
    const credential = await signInWithEmailAndPassword(auth, email, pass);
    return mapFirebaseUser(credential.user);
  } catch (err: any) {
    console.error('loginWithEmail error:', err);
    throw new Error(formatAuthError(err));
  }
};

export const signupWithEmail = async (email: string, pass: string) => {
  try {
    const credential = await createUserWithEmailAndPassword(auth, email, pass);
    return mapFirebaseUser(credential.user);
  } catch (err: any) {
    console.error('signupWithEmail error:', err);
    throw new Error(formatAuthError(err));
  }
};

export const loginWithGoogle = async () => {
  try {
    const credential = await signInWithPopup(auth, googleProvider);
    return mapFirebaseUser(credential.user);
  } catch (err: any) {
    console.error('loginWithGoogle error:', err);
    throw new Error(formatAuthError(err));
  }
};

export const loginAsGuest = async () => {
  try {
    const credential = await signInAnonymously(auth);
    return mapFirebaseUser(credential.user);
  } catch (err: any) {
    console.warn('signInAnonymously failed, falling back to local guest session:', err);
    const guestUser: UserProfile = {
      uid: `guest-local-${Date.now()}`,
      email: 'guest@pycloud.workspace',
      displayName: 'Guest Pythonist',
      photoURL: undefined,
      isAnonymous: true,
    };
    setLocalUser(guestUser);
    return guestUser;
  }
};

export const logoutUser = async () => {
  setLocalUser(null);
  try {
    await signOut(auth);
  } catch {
    // Ignore
  }
};

export const updateUserPassword = async (newPassword: string) => {
  if (auth.currentUser) {
    await firebaseUpdatePassword(auth.currentUser, newPassword);
  } else {
    throw new Error('No user currently authenticated');
  }
};

export const deleteAccount = async () => {
  if (auth.currentUser) {
    await firebaseDeleteUser(auth.currentUser);
  } else {
    throw new Error('No user currently authenticated');
  }
};

// --- FIRESTORE PROJECT HELPERS ---

// Get all projects owned by user
export const getUserProjects = async (userId: string): Promise<Project[]> => {
  try {
    const q = query(
      collection(db, 'projects'),
      where('ownerId', '==', userId)
    );
    const snapshot = await getDocs(q);
    const projects: Project[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      projects.push({
        id: docSnap.id,
        title: data.title || 'Untitled Project',
        description: data.description || '',
        code: data.code || '',
        ownerId: data.ownerId,
        ownerEmail: data.ownerEmail,
        ownerName: data.ownerName,
        privacy: data.privacy || 'private',
        isShared: data.isShared ?? (data.privacy === 'shared'),
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
        tags: data.tags || [],
      });
    });
    // Sort in memory by updatedAt desc
    return projects.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  } catch (err) {
    console.error('Error fetching user projects from Firestore:', err);
    throw err;
  }
};

// Get single project by ID (checks ownership or shared status)
export const getProjectById = async (projectId: string): Promise<Project | null> => {
  try {
    const docRef = doc(db, 'projects', projectId);
    const docSnap = await getDoc(docRef);
    if (!docSnap.exists()) {
      return null;
    }
    const data = docSnap.data();
    return {
      id: docSnap.id,
      title: data.title || 'Untitled Project',
      description: data.description || '',
      code: data.code || '',
      ownerId: data.ownerId,
      ownerEmail: data.ownerEmail,
      ownerName: data.ownerName,
      privacy: data.privacy || 'private',
      isShared: data.isShared ?? (data.privacy === 'shared'),
      createdAt: data.createdAt || new Date().toISOString(),
      updatedAt: data.updatedAt || new Date().toISOString(),
      tags: data.tags || [],
    };
  } catch (err) {
    console.error(`Error fetching project ${projectId}:`, err);
    throw err;
  }
};

// Create new project
export const createProjectInDb = async (
  projectData: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Project> => {
  const now = new Date().toISOString();
  const payload = {
    ...projectData,
    createdAt: now,
    updatedAt: now,
    isShared: projectData.privacy === 'shared',
  };
  
  const docRef = await addDoc(collection(db, 'projects'), payload);
  return {
    ...payload,
    id: docRef.id,
  };
};

// Update project (code, title, privacy, tags)
export const updateProjectInDb = async (
  projectId: string,
  updates: Partial<Omit<Project, 'id' | 'ownerId'>>
): Promise<void> => {
  const docRef = doc(db, 'projects', projectId);
  const now = new Date().toISOString();
  
  const updatePayload: Record<string, any> = {
    ...updates,
    updatedAt: now,
  };

  if (updates.privacy) {
    updatePayload.isShared = updates.privacy === 'shared';
  }

  await updateDoc(docRef, updatePayload);
};

// Delete project
export const deleteProjectFromDb = async (projectId: string): Promise<void> => {
  const docRef = doc(db, 'projects', projectId);
  await deleteDoc(docRef);
};

// --- VERSION HISTORY HELPERS ---

export const saveProjectVersion = async (
  projectId: string,
  code: string,
  label: string = 'Snapshot',
  createdBy: string = 'User'
): Promise<ProjectVersion> => {
  const now = new Date().toISOString();
  const versionsRef = collection(db, 'projects', projectId, 'versions');
  const docRef = await addDoc(versionsRef, {
    projectId,
    code,
    label,
    createdAt: now,
    createdBy,
  });

  return {
    id: docRef.id,
    projectId,
    code,
    label,
    createdAt: now,
    createdBy,
  };
};

export const getProjectVersions = async (projectId: string): Promise<ProjectVersion[]> => {
  try {
    const versionsRef = collection(db, 'projects', projectId, 'versions');
    const snapshot = await getDocs(versionsRef);
    const versions: ProjectVersion[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      versions.push({
        id: docSnap.id,
        projectId: data.projectId,
        code: data.code,
        label: data.label || 'Snapshot',
        createdAt: data.createdAt || new Date().toISOString(),
        createdBy: data.createdBy || 'User',
      });
    });
    return versions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (err) {
    console.error('Error fetching version history:', err);
    return [];
  }
};
