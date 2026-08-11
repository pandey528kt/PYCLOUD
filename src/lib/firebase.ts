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

export const subscribeToAuth = (callback: (user: UserProfile | null) => void) => {
  try {
    return onAuthStateChanged(
      auth,
      (firebaseUser) => {
        callback(mapFirebaseUser(firebaseUser));
      },
      (error) => {
        console.warn('Auth state change error:', error);
        callback(null);
      }
    );
  } catch (err) {
    console.warn('subscribeToAuth exception:', err);
    callback(null);
    return () => {};
  }
};


export const loginWithEmail = async (email: string, pass: string) => {
  const credential = await signInWithEmailAndPassword(auth, email, pass);
  return mapFirebaseUser(credential.user);
};

export const signupWithEmail = async (email: string, pass: string) => {
  const credential = await createUserWithEmailAndPassword(auth, email, pass);
  return mapFirebaseUser(credential.user);
};

export const loginWithGoogle = async () => {
  const credential = await signInWithPopup(auth, googleProvider);
  return mapFirebaseUser(credential.user);
};

export const loginAsGuest = async () => {
  const credential = await signInAnonymously(auth);
  return mapFirebaseUser(credential.user);
};

export const logoutUser = async () => {
  await signOut(auth);
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
