import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary] Uncaught render error:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center px-4">
        <div className="panel max-w-md w-full p-10 text-center space-y-5">
          <p className="text-5xl">⚠️</p>
          <div>
            <h1 className="text-xl font-bold text-slate-100 mb-2">Something went wrong</h1>
            <p className="text-slate-400 text-sm leading-relaxed">
              An unexpected error occurred. Your data is safe — this is a display issue.
            </p>
          </div>
          {this.state.error?.message && (
            <p className="text-xs font-mono text-slate-600 bg-navy-900 px-3 py-2 rounded-lg border border-slate-700 break-all">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="btn-primary px-8 py-2.5"
          >
            Reload page
          </button>
        </div>
      </div>
    );
  }
}
