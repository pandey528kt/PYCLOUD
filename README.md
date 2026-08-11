# PyCloud Workspace 🐍⚡

> Premium 3D Python Code Cloud Workspace built with React, Monaco Editor, Pyodide WebAssembly, and Firebase. Fully compatible with GitHub Pages hosting.

---

## ✨ Key Features

- **3D Tactile UI**: Classic dark charcoal canvas with subtle depth, perspective shadows, and tactile 3D cards.
- **Client-Side WebAssembly Execution**: Powered by Pyodide engine. Runs Python directly inside browser without requiring a backend Python server!
- **Monaco Code Editor**: Professional VS Code editor in browser with Python syntax highlighting, line numbers, mini-map, auto-save, and keyboard shortcuts (`Ctrl+Enter` to run, `Ctrl+S` to save).
- **Cloud Project Storage**: Firebase Firestore database syncs projects across computers (home, school, mobile).
- **Authentication**: Email/Password, Google OAuth, and Anonymous Guest mode.
- **Permission & Security**:
  - **Owner**: Full edit, rename, delete, and privacy toggle permissions.
  - **Shared Links**: Read-only view for shared users with a one-click **"Fork / Copy to My Workspace"** button. Unshared private projects are strictly hidden.
- **Version Snapshot History**: Save code snapshots with one-click restore options.
- **Import / Export**: Import `.py` files directly and export scripts with one click.
- **100% GitHub Pages Compatible**: Pure static Single Page Application (SPA). Zero server overhead.

---

## 🚀 How to Deploy to GitHub Pages

### Step 1: Set Up Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Under **Build > Authentication**, enable **Email/Password**, **Google**, and **Anonymous** sign-in methods.
3. Under **Build > Firestore Database**, create a Firestore database in Production mode.
4. Under **Project Settings > General**, add a Web App and copy your Firebase configuration object.
5. In **Firestore Rules**, copy and paste the contents of `firestore.rules` from this repository:

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isAuthenticated() { return request.auth != null; }

    match /projects/{projectId} {
      allow read: if resource.data.ownerId == request.auth.uid || 
                     resource.data.privacy == "shared" || 
                     resource.data.isShared == true;
      allow create: if isAuthenticated() && request.resource.data.ownerId == request.auth.uid;
      allow update, delete: if isAuthenticated() && resource.data.ownerId == request.auth.uid;

      match /versions/{versionId} {
        allow read: if get(/databases/$(database)/documents/projects/$(projectId)).data.ownerId == request.auth.uid ||
                       get(/databases/$(database)/documents/projects/$(projectId)).data.privacy == "shared" ||
                       get(/databases/$(database)/documents/projects/$(projectId)).data.isShared == true;
        allow create, update, delete: if isAuthenticated() && 
          get(/databases/$(database)/documents/projects/$(projectId)).data.ownerId == request.auth.uid;
      }
    }
  }
}
```

---

### Step 2: Push Repository to GitHub

```bash
git init
git add .
git commit -m "Initial commit - PyCloud Workspace"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/pycloud-workspace.git
git push -u origin main
```

---

### Step 3: Enable GitHub Actions Automated Deployment

Create a file at `.github/workflows/deploy.yml`:

```yaml
name: Deploy PyCloud Workspace to GitHub Pages

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
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

In GitHub Repository **Settings > Pages**:
- Set **Source** to `Deploy from a branch`
- Choose `gh-pages` branch and `/ (root)` folder.

Your 3D Python Cloud Workspace is now live on `https://YOUR_USERNAME.github.io/pycloud-workspace/`! 🚀

---

## 💻 Local Development

```bash
# Install dependencies
npm install

# Start local Vite dev server on port 3000
npm run dev

# Build static production bundle
npm run build
```

---

## 📜 License

Apache-2.0 License. Built for developers & learners everywhere.
