import { Component, type ErrorInfo, type ReactNode } from 'react';

/** Keeps a render error in one page from blanking the whole app. Resets when the route changes. */
export default class ErrorBoundary extends Component<{ children: ReactNode; resetKey: string }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('PhishShield UI error:', error, info.componentStack);
  }

  componentDidUpdate(prev: { resetKey: string }) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-bold">Something went wrong on this page</h1>
        <p className="mt-3 text-slate-400">{this.state.error.message}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 rounded-lg bg-cyan-500 px-5 py-2.5 font-semibold text-slate-950 hover:bg-cyan-400"
        >
          Reload
        </button>
      </div>
    );
  }
}
