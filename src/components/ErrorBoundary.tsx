import * as React from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public override state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught Error in PyCloud Workspace:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Ignore
    }
    window.location.href = window.location.pathname;
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050505] text-gray-200 flex items-center justify-center p-6 font-sans">
          <div className="w-full max-w-lg bg-[#08080a] border border-red-500/30 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-950 border border-red-800 text-red-400">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white">Application Exception Caught</h2>
                <p className="text-xs text-gray-400">PyCloud Workspace encountered an unexpected error</p>
              </div>
            </div>

            <div className="bg-[#030303] p-4 rounded-xl border border-white/5 font-mono text-xs text-red-300 overflow-auto max-h-48 leading-relaxed">
              {this.state.error?.toString() || 'Unknown Error'}
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              This error may be caused by cached state, blocked cookies, or network disruption. Try reloading the application or clearing local workspace cache.
            </p>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                onClick={this.handleResetCache}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-[#0a0a0d] px-4 py-2 text-xs font-medium text-gray-300 hover:bg-[#121218] transition-all"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-400" />
                <span>Reset Local Cache</span>
              </button>

              <button
                onClick={this.handleReload}
                className="flex items-center gap-1.5 rounded-xl border border-blue-400/30 bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow hover:brightness-110 transition-all"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Reload Application</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
