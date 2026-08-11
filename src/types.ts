export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  isAnonymous: boolean;
}

export type ProjectPrivacy = 'private' | 'shared';

export interface Project {
  id: string;
  title: string;
  description?: string;
  code: string;
  ownerId: string;
  ownerEmail?: string;
  ownerName?: string;
  privacy: ProjectPrivacy;
  isShared: boolean;
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
  tags?: string[];
}

export interface ProjectVersion {
  id: string;
  projectId: string;
  code: string;
  label?: string;
  createdAt: string;
  createdBy: string;
}

export interface ExecutionResult {
  output: string;
  error: string | null;
  executionTimeMs: number;
  status: 'idle' | 'running' | 'success' | 'error';
}

export interface PythonTemplate {
  id: string;
  title: string;
  description: string;
  category: 'Basics' | 'Data Science' | 'Game' | 'Algorithms' | 'Math';
  code: string;
}
