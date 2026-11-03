import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[TipZeMe ErrorBoundary Caught]:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[250px] w-full p-6 sm:p-8 flex items-center justify-center">
          <div className="max-w-md w-full bg-white border border-[#E8E2EF] rounded-3xl p-6 text-center shadow-lg">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3 border border-red-100">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-[#17131D]">
              {this.props.fallbackTitle || 'Something went wrong'}
            </h3>
            <p className="text-xs text-[#77717E] mt-1 leading-relaxed">
              We encountered an issue displaying this section. Please try again.
            </p>
            <button
              onClick={this.handleReset}
              className="mt-4 px-5 py-2.5 rounded-xl bg-[#7427DF] hover:bg-[#5819B8] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 mx-auto cursor-pointer shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
