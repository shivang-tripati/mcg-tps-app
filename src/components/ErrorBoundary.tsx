import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Toast from 'react-native-toast-message';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
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
        console.error('❌ ErrorBoundary caught:', error, errorInfo);
        
        // ✅ Log to error tracking service
        this.logErrorToService(error, errorInfo);
        
        // ✅ Show toast
        Toast.show({
            type: 'error',
            text1: 'Something went wrong',
            text2: error.message || 'An unexpected error occurred',
            position: 'top',
            visibilityTime: 4000,
        });

        // ✅ Call custom error handler
        if (this.props.onError) {
            this.props.onError(error, errorInfo);
        }
    }

    logErrorToService(error: Error, errorInfo: ErrorInfo) {
        // Send to Sentry, Bugsnag, etc.
        // Sentry.captureException(error, { extra: errorInfo });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <View className="flex-1 items-center justify-center bg-background p-6">
                    <View className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 items-center justify-center mb-4">
                        <Text className="text-4xl text-red-600 dark:text-red-400">⚠️</Text>
                    </View>
                    <Text className="text-xl font-bold text-foreground text-center mb-2">
                        Oops! Something went wrong
                    </Text>
                    <Text className="text-muted-foreground text-center mb-6">
                        {this.state.error?.message || 'An unexpected error occurred'}
                    </Text>
                    <TouchableOpacity
                        className="bg-primary px-8 py-3 rounded-xl"
                        onPress={this.handleReset}
                    >
                        <Text className="text-primary-foreground font-semibold">Try Again</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return this.props.children;
    }
}