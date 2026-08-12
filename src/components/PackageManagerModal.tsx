import React, { useState } from 'react';
import { Package, Search, Download, Check, AlertCircle, X, Terminal, Loader2 } from 'lucide-react';
import { Card3D } from './3d/Card3D';
import { loadPyodideEngine } from '../lib/pyodide';

interface PopularPackage {
  name: string;
  category: string;
  description: string;
}

const POPULAR_PACKAGES: PopularPackage[] = [
  { name: 'numpy', category: 'Data Science', description: 'N-dimensional arrays & numerical processing' },
  { name: 'pandas', category: 'Data Science', description: 'Data structures & analytics tools' },
  { name: 'matplotlib', category: 'Visualization', description: 'Plotting & 2D graph visualizations' },
  { name: 'scipy', category: 'Scientific', description: 'Scientific algorithms & linear algebra' },
  { name: 'sympy', category: 'Math', description: 'Symbolic mathematics & algebraic calculus' },
  { name: 'requests', category: 'Networking', description: 'HTTP library for sending requests' },
  { name: 'beautifulsoup4', category: 'Web Parsing', description: 'Screen-scraping & HTML parsing' },
  { name: 'scikit-learn', category: 'Machine Learning', description: 'Machine learning algorithms & predictive model tools' },
  { name: 'pillow', category: 'Image Processing', description: 'Image processing and graphics manipulation' },
];

interface PackageManagerModalProps {
  onClose: () => void;
}

export const PackageManagerModal: React.FC<PackageManagerModalProps> = ({ onClose }) => {
  const [packageNameInput, setPackageNameInput] = useState('');
  const [installedPackages, setInstalledPackages] = useState<string[]>(['sys', 'os', 'json', 'math', 'urllib', 'time', 'random']);
  const [installingPackage, setInstallingPackage] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>(['Pyodide package ecosystem initialized.']);
  const [error, setError] = useState<string | null>(null);

  const handleInstallPackage = async (pkgName: string) => {
    const cleanPkgName = pkgName.trim().toLowerCase();
    if (!cleanPkgName) return;

    if (installedPackages.includes(cleanPkgName)) {
      setLogs((prev) => [...prev, `[INFO] Package '${cleanPkgName}' is already installed.`]);
      return;
    }

    setInstallingPackage(cleanPkgName);
    setError(null);
    setLogs((prev) => [...prev, `[INSTALLING] Loading micropip and downloading '${cleanPkgName}'...`]);

    try {
      const pyodide = await loadPyodideEngine();
      
      // Load micropip
      await pyodide.loadPackage('micropip');
      const micropip = pyodide.pyimport('micropip');
      
      await micropip.install(cleanPkgName);
      
      setInstalledPackages((prev) => [...prev, cleanPkgName]);
      setLogs((prev) => [...prev, `[SUCCESS] Package '${cleanPkgName}' installed successfully into WASM engine!`]);
      setPackageNameInput('');
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      setError(`Failed to install '${cleanPkgName}': ${errMsg}`);
      setLogs((prev) => [...prev, `[ERROR] Installation failed for '${cleanPkgName}': ${errMsg}`]);
    } finally {
      setInstallingPackage(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#07090e]/85 p-4 backdrop-blur-xs">
      <Card3D className="w-full max-w-2xl max-h-[85vh] flex flex-col p-6 space-y-4" hoverEffect={false}>
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#161a28] border border-amber-500/40 text-amber-400 shadow-md">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                Python Package Manager <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">Pyodide WASM</span>
              </h2>
              <p className="text-xs text-slate-400">
                Install PyPI packages directly into client browser runtime via micropip
              </p>
            </div>
          </div>

          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Custom Package Install Input */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300">Install Custom PyPI Package</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Enter PyPI package name (e.g. numpy, pandas, sympy)..."
                value={packageNameInput}
                onChange={(e) => setPackageNameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleInstallPackage(packageNameInput)}
                className="w-full input-3d rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-200 placeholder-slate-500 font-sans"
              />
            </div>
            <button
              onClick={() => handleInstallPackage(packageNameInput)}
              disabled={!packageNameInput.trim() || !!installingPackage}
              className="btn-3d-emerald px-4 py-2.5 rounded-xl text-xs font-extrabold text-white flex items-center gap-1.5 disabled:opacity-40"
            >
              {installingPackage === packageNameInput.trim().toLowerCase() ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Installing...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Install</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Popular Packages Grid */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-300">Popular Tested Packages</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-48 overflow-y-auto pr-1">
            {POPULAR_PACKAGES.map((pkg) => {
              const isInstalled = installedPackages.includes(pkg.name);
              const isCurrentInstalling = installingPackage === pkg.name;

              return (
                <div
                  key={pkg.name}
                  className="rounded-xl border border-slate-800 bg-[#0a0c12] p-3 flex flex-col justify-between gap-2 shadow-inner hover:border-slate-700"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold font-mono text-amber-300">{pkg.name}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-bold">
                        {pkg.category}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{pkg.description}</p>
                  </div>

                  {isInstalled ? (
                    <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold font-mono">
                      <Check className="h-3 w-3" /> Installed
                    </div>
                  ) : (
                    <button
                      onClick={() => handleInstallPackage(pkg.name)}
                      disabled={!!installingPackage}
                      className="btn-3d-slate w-full py-1 rounded-lg text-[11px] font-bold text-white flex items-center justify-center gap-1 disabled:opacity-40"
                    >
                      {isCurrentInstalling ? (
                        <>
                          <Loader2 className="h-3 w-3 animate-spin" />
                          <span>Installing...</span>
                        </>
                      ) : (
                        <>
                          <Download className="h-3 w-3" />
                          <span>Install</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Live Micropip Log Output */}
        <div className="space-y-1.5 flex-1 flex flex-col">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
            <Terminal className="h-3.5 w-3.5 text-amber-400" />
            <span>Micropip Installation Logs</span>
          </div>
          <div className="flex-1 bg-[#05060a] border border-slate-800 rounded-xl p-3 font-mono text-[10px] text-emerald-400/90 overflow-y-auto space-y-1 max-h-32">
            {logs.map((log, idx) => (
              <div key={idx} className="leading-tight">
                {log}
              </div>
            ))}
          </div>
        </div>

      </Card3D>
    </div>
  );
};
