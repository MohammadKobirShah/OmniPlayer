import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Rendered if the subtree throws. */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Lightweight error boundary so a failure inside an isolated subtree (e.g. the
 * embed preview) never tears down the whole app. Re-mounts fresh when its
 * children change.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.error('[OmniStream] preview error:', error);
  }

  componentDidUpdate(prev: Props) {
    if (this.state.hasError && prev.children !== this.props.children) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              color: '#b3b3b3',
              background: '#0b0b0b',
              fontSize: '0.85rem',
            }}
          >
            Preview unavailable
          </div>
        )
      );
    }
    return this.props.children;
  }
}
