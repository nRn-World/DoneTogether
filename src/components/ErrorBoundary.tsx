import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error);
    console.error('Error info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="min-h-screen bg-gradient-to-br from-emerald-500 via-emerald-600 to-emerald-700 flex items-center justify-center p-6">
          <div role="alert" className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full text-center border border-white/20">
            <h1 className="text-2xl font-black text-white mb-4">Oops! Något gick fel</h1>
            <p className="text-white/80 mb-6">
              {this.state.error?.message || 'Ett oväntat fel uppstod'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-white text-emerald-700 px-6 py-3 rounded-xl font-bold hover:bg-white/90 transition-colors"
            >
              Ladda om appen
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}