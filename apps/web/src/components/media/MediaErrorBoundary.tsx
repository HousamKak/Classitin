import { Component, type ReactNode } from 'react';
import { ErrorAlert } from '@/components/common/ErrorAlert';

interface Props {
  children: ReactNode;
}

interface State {
  error: string | null;
}

export class MediaErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorAlert
          message={`Media error: ${this.state.error}`}
          onDismiss={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}
