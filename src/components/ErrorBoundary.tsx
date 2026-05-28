// @ts-nocheck
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { GlobalErrorFallback, SectionErrorFallback } from './ui/ErrorFallbacks';

interface Props {
  children: ReactNode;
  fallback: React.ComponentType<{ error: Error; resetErrorBoundary: () => void }>;
  onReset?: () => void;
  name?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ErrorBoundary:${this.props.name || 'Anonymous'}] Caught error:`, {
      error,
      message: error.message,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      route: window.location.pathname
    });
  }

  private resetErrorBoundary = () => {
    this.props.onReset?.();
    this.setState({
      hasError: false,
      error: null
    });
  };

  public render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback;
      return (
        <FallbackComponent 
          error={this.state.error} 
          resetErrorBoundary={this.resetErrorBoundary} 
        />
      );
    }

    return this.props.children;
  }
}

// Helper Wrappers
export function GlobalErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary name="Global" fallback={GlobalErrorFallback}>
      {children}
    </ErrorBoundary>
  );
}

export function SectionErrorBoundary({ children, title, message, name }: { children: ReactNode, title?: string, message?: string, name?: string }) {
  const Fallback = (props: any) => (
    <SectionErrorFallback {...props} title={title} message={message} />
  );
  
  return (
    <ErrorBoundary name={name || title} fallback={Fallback}>
      {children}
    </ErrorBoundary>
  );
}
