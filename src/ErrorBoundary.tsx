import React from "react";

type ErrorBoundaryProps = {
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
  error: unknown;
};

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown): void {
    // eslint-disable-next-line no-console
    console.error("Unhandled UI error:", error);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback !== undefined) {
        return this.props.fallback;
      }
      const message = this.state.error instanceof Error ? this.state.error.message : String(this.state.error ?? "");
      return (
        <div className="app" role="alert">
          <section className="card">
            <h2>Wystąpił błąd interfejsu</h2>
            <p className="hint">Odśwież stronę, aby spróbować ponownie.</p>
            {message && (
              <details style={{ marginTop: "0.5rem" }}>
                <summary className="hint" style={{ cursor: "pointer" }}>Szczegóły błędu</summary>
                <pre className="hint" style={{ marginTop: "0.25rem", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{message}</pre>
              </details>
            )}
            <button
              className="action-btn"
              style={{ marginTop: "1rem" }}
              onClick={() => window.location.reload()}
            >
              Odśwież stronę
            </button>
          </section>
        </div>
      );
    }
    return this.props.children;
  }
}
