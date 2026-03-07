import { StrictMode, Component, type ErrorInfo } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App.tsx'

// Error boundary component to catch and display runtime errors
interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CRITICAL APP ERROR:', error);
    console.error('Component Stack:', errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#09090b',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '600px',
            width: '100%',
            backgroundColor: '#18181b',
            borderRadius: '16px',
            border: '1px solid #27272a',
            padding: '32px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px', color: '#ef4444' }}>
              ⚠️ Något gick fel
            </h1>
            <p style={{ marginBottom: '24px', color: '#a1a1aa', lineHeight: '1.6' }}>
              Applikationen kraschade. Detta beror oftast på ett kodfel eller problem med att ladda data.
            </p>

            {this.state.error && (
              <div style={{
                backgroundColor: '#000',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px',
                border: '1px solid #ef4444',
                overflow: 'auto',
                maxHeight: '200px'
              }}>
                <code style={{ fontFamily: 'monospace', fontSize: '13px', color: '#f87171' }}>
                  {this.state.error.toString()}
                </code>
              </div>
            )}

            <button
              onClick={() => window.location.reload()}
              style={{
                width: '100%',
                padding: '14px',
                backgroundColor: '#10b981',
                color: 'black',
                border: 'none',
                borderRadius: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '15px'
              }}
            >
              Försök igen
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element not found');

  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  )
} catch (error) {
  console.error('CRITICAL STARTUP ERROR:', error);
  document.body.textContent = '';

  const wrapper = document.createElement('div');
  wrapper.style.background = '#09090b';
  wrapper.style.color = '#fff';
  wrapper.style.minHeight = '100vh';
  wrapper.style.padding = '20px';
  wrapper.style.fontFamily = 'monospace';

  const title = document.createElement('h1');
  title.style.color = '#ef4444';
  title.textContent = 'Startup Error';

  const pre = document.createElement('pre');
  pre.textContent = error instanceof Error ? (error.stack || error.message) : String(error);

  wrapper.appendChild(title);
  wrapper.appendChild(pre);
  document.body.appendChild(wrapper);
}
