import React, { useState } from 'react';
import { BookOpen, Copy, Check, Github, Globe, Server, Terminal, Shield, ArrowRight } from 'lucide-react';
import { Card3D } from './3d/Card3D';

export const GitHubPagesDocs: React.FC = () => {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const workflowYaml = `name: Deploy PyCloud Workspace to GitHub Pages

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install Dependencies
        run: npm ci

      - name: Build Static App
        run: npm run build

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: \${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      
      {/* Title */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-950/60 px-3 py-1 text-xs text-blue-300 font-mono">
          <Github className="h-3.5 w-3.5" />
          <span>Zero Server Overhead • 100% Client-Side Compatible</span>
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          GitHub Pages & Firebase Deployment Guide
        </h1>
        <p className="text-xs text-gray-400 max-w-2xl">
          PyCloud Workspace compiles down to a pure static Single-Page Application (SPA) powered by Pyodide WebAssembly and Firebase Web SDK. Follow these steps to host your workspace on GitHub Pages for free!
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card3D className="p-4 space-y-2" hoverEffect={false}>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-950 border border-blue-800 text-blue-400">
            <Globe className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-bold text-gray-200">1. Static Frontend</h3>
          <p className="text-[11px] text-gray-400 leading-normal">
            No Node/Express server required for runtime. Monaco Editor and Pyodide run directly inside the visitor's browser.
          </p>
        </Card3D>

        <Card3D className="p-4 space-y-2" hoverEffect={false}>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-950 border border-indigo-800 text-indigo-400">
            <Server className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-bold text-gray-200">2. Firebase Cloud Sync</h3>
          <p className="text-[11px] text-gray-400 leading-normal">
            Firestore handles project storage, permission checks, and auth across devices securely without expose risk.
          </p>
        </Card3D>

        <Card3D className="p-4 space-y-2" hoverEffect={false}>
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-950 border border-blue-800 text-blue-400">
            <Github className="h-4 w-4" />
          </div>
          <h3 className="text-xs font-bold text-gray-200">3. GitHub Action Deploy</h3>
          <p className="text-[11px] text-gray-400 leading-normal">
            Automated build & push on every commit to `main` branch directly to your `.github.io` site.
          </p>
        </Card3D>
      </div>

      {/* Step 1: Firebase Configuration */}
      <Card3D className="p-6 space-y-4" hoverEffect={false}>
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-900 text-xs font-bold text-blue-300">
            1
          </span>
          <h3 className="text-sm font-bold text-white">Step 1: Configure Firebase Project</h3>
        </div>

        <ol className="list-decimal list-inside space-y-2 text-xs text-gray-300 leading-relaxed">
          <li>
            Go to <a href="https://console.firebase.google.com" target="_blank" rel="noreferrer" className="text-blue-400 underline">Firebase Console</a> and create a new project.
          </li>
          <li>
            Enable <strong>Email/Password</strong> and <strong>Anonymous / Google Auth</strong> under <em>Build &gt; Authentication</em>.
          </li>
          <li>
            Create a <strong>Cloud Firestore</strong> database in Production mode.
          </li>
          <li>
            Under <em>Project Settings &gt; General &gt; Your Apps</em>, register a Web App and copy your Firebase Config JSON object.
          </li>
          <li>
            Copy the <code>firestore.rules</code> from this repository to your Firebase Firestore Rules console.
          </li>
        </ol>
      </Card3D>

      {/* Step 2: GitHub Repository Setup */}
      <Card3D className="p-6 space-y-4" hoverEffect={false}>
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-900 text-xs font-bold text-blue-300">
            2
          </span>
          <h3 className="text-sm font-bold text-white">Step 2: Push to GitHub & Enable Pages</h3>
        </div>

        <div className="space-y-3">
          <p className="text-xs text-gray-300">
            Run the following commands in your terminal to initialize and push to your GitHub repo:
          </p>

          <div className="relative bg-[#050505] p-4 rounded-xl border border-white/10 font-mono text-xs text-blue-400 overflow-x-auto">
            <button
              onClick={() => copyToClipboard('git init\ngit add .\ngit commit -m "Deploy PyCloud Workspace"\ngit branch -M main\ngit remote add origin https://github.com/YOUR_USERNAME/pycloud-workspace.git\ngit push -u origin main', 'git')}
              className="absolute right-3 top-3 rounded bg-[#0a0a0d] border border-white/10 p-1.5 text-[10px] text-gray-300 hover:text-white"
            >
              {copiedSection === 'git' ? <Check className="h-3.5 w-3.5 text-blue-400" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <pre>
{`git init
git add .
git commit -m "Deploy PyCloud Workspace"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/pycloud-workspace.git
git push -u origin main`}
            </pre>
          </div>
        </div>
      </Card3D>

      {/* Step 3: GitHub Actions Workflow */}
      <Card3D className="p-6 space-y-4" hoverEffect={false}>
        <div className="flex items-center gap-2 border-b border-white/10 pb-3">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-900 text-xs font-bold text-blue-300">
            3
          </span>
          <h3 className="text-sm font-bold text-white">Step 3: GitHub Actions Deployment Workflow</h3>
        </div>

        <p className="text-xs text-gray-300">
          Create a file named <code>.github/workflows/deploy.yml</code> in your repository with the following YAML configuration:
        </p>

        <div className="relative bg-[#050505] p-4 rounded-xl border border-white/10 font-mono text-xs text-gray-300 overflow-x-auto">
          <button
            onClick={() => copyToClipboard(workflowYaml, 'yaml')}
            className="absolute right-3 top-3 rounded bg-[#0a0a0d] border border-white/10 p-1.5 text-[10px] text-gray-300 hover:text-white"
          >
            {copiedSection === 'yaml' ? <Check className="h-3.5 w-3.5 text-blue-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <pre>{workflowYaml}</pre>
        </div>

        <div className="rounded-xl border border-blue-800/60 bg-blue-950/40 p-3 text-xs text-blue-300 space-y-2">
          <div className="flex items-center gap-2 font-semibold">
            <Globe className="h-4 w-4 shrink-0" />
            <span>Avoid Blank White Screen on GitHub Pages:</span>
          </div>
          <p className="text-[11px] text-gray-300 leading-relaxed pl-6">
            Make sure <code>vite.config.ts</code> contains <code>base: './'</code> (pre-configured in this repository). This ensures asset paths like scripts and styles use relative URLs matching your GitHub repository subpath (e.g. <code>https://username.github.io/repository-name/</code>).
          </p>
          <p className="text-[11px] text-gray-300 leading-relaxed pl-6">
            In your GitHub repository, go to <strong>Settings &gt; Pages</strong> and set Source to <strong>gh-pages branch</strong>!
          </p>
        </div>
      </Card3D>

    </div>
  );
};
