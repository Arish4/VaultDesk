import { Component } from "react";

// Error boundaries must be class components: they catch render errors in any child
// and show a fallback instead of a blank white page.
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("UI crashed:", error, info.componentStack); // a real app would send this to Sentry
  }

  render() {
    if (this.state.error) {
      return (
        <div className="page">
          <h1>Something went wrong</h1>
          <p>Please refresh the page. If it keeps happening, contact support.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
