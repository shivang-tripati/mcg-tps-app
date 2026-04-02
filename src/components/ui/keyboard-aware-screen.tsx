import { KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import React from 'react';

interface KeyboardAwareScreenProps {
    children: React.ReactNode;
    /** NativeWind className for SafeAreaView */
    className?: string;
    /** SafeAreaView edges to apply. Defaults to all edges. */
    edges?: Edge[];
    /** Extra offset for KeyboardAvoidingView on iOS. Defaults to 0. */
    keyboardVerticalOffset?: number;
    /** Whether to wrap children in a ScrollView. Defaults to false. */
    scrollable?: boolean;
    /** Additional ScrollView props when scrollable is true */
    scrollViewProps?: React.ComponentProps<typeof ScrollView>;
    /** Style for the SafeAreaView (inline styles, not NativeWind) */
    style?: React.ComponentProps<typeof SafeAreaView>['style'];
}

/**
 * A reusable screen wrapper that handles:
 * - SafeAreaView with configurable edges
 * - KeyboardAvoidingView with platform-specific behavior
 * - Optional ScrollView with keyboardShouldPersistTaps="handled"
 *
 * This component ensures keyboard doesn't cover inputs/buttons
 * and the screen lifts properly when the keyboard opens.
 */
export function KeyboardAwareScreen({
    children,
    className = 'flex-1 bg-background',
    edges,
    keyboardVerticalOffset = 0,
    scrollable = false,
    scrollViewProps,
    style,
}: KeyboardAwareScreenProps) {
    return (
        <SafeAreaView className={className} edges={edges} style={style}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
                keyboardVerticalOffset={keyboardVerticalOffset}
            >
                {scrollable ? (
                    <ScrollView
                        contentContainerStyle={{ flexGrow: 1 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        {...scrollViewProps}
                    >
                        {children}
                    </ScrollView>
                ) : (
                    children
                )}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}
