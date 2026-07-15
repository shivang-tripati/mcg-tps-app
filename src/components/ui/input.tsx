import { forwardRef, useState } from 'react';
import {
    Text,
    TextInput,
    View,
    type TextInputProps,
} from 'react-native';
import { AlertCircle, Info } from 'lucide-react-native';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    helperText?: string;
    required?: boolean;
    className?: string;
    containerClassName?: string;
    leftElement?: React.ReactNode;
    rightElement?: React.ReactNode;
}

export const Input = forwardRef<TextInput, InputProps>(
    (
        {
            className,
            containerClassName,
            label,
            error,
            helperText,
            required = false,
            leftElement,
            rightElement,
            multiline,
            editable = true,
            onFocus,
            onBlur,
            accessibilityLabel,
            accessibilityHint,
            ...props
        },
        ref
    ) => {
        const [focused, setFocused] = useState(false);
        const describedText = error || helperText;

        return (
            <View className={cn('mb-4', containerClassName)}>
                {label ? (
                    <Text className="mb-2 text-sm font-medium text-foreground">
                        {label}
                        {required ? <Text className="text-destructive"> *</Text> : null}
                    </Text>
                ) : null}

                <View
                    className={cn(
                        'min-h-12 flex-row items-center rounded-xl border bg-background',
                        focused && !error && 'border-primary',
                        !focused && !error && 'border-input',
                        error && 'border-destructive',
                        !editable && 'bg-muted/60 opacity-80'
                    )}
                >
                    {leftElement ? (
                        <View className="ml-3 items-center justify-center">{leftElement}</View>
                    ) : null}

                    <TextInput
                        ref={ref}
                        className={cn(
                            'min-h-12 flex-1 px-3 py-2 text-base text-foreground',
                            multiline && 'min-h-[104px] py-3',
                            leftElement && 'pl-2',
                            rightElement && 'pr-2',
                            className
                        )}
                        multiline={multiline}
                        editable={editable}
                        placeholderTextColor="hsl(220 9% 46%)"
                        selectionColor="hsl(342 66% 34%)"
                        underlineColorAndroid="transparent"
                        accessibilityLabel={accessibilityLabel || label || props.placeholder}
                        accessibilityHint={
                            error ? `Error: ${error}` : accessibilityHint || helperText
                        }
                        accessibilityState={{ disabled: !editable }}
                        aria-invalid={Boolean(error)}
                        onFocus={(event) => {
                            setFocused(true);
                            onFocus?.(event);
                        }}
                        onBlur={(event) => {
                            setFocused(false);
                            onBlur?.(event);
                        }}
                        {...props}
                    />

                    {rightElement ? (
                        <View className="mr-3 items-center justify-center">{rightElement}</View>
                    ) : null}
                </View>

                {describedText ? (
                    <View className="mt-1.5 flex-row items-start">
                        {error ? (
                            <AlertCircle size={14} color="hsl(0 72% 51%)" />
                        ) : (
                            <Info size={14} color="hsl(220 9% 46%)" />
                        )}
                        <Text
                            className={cn(
                                'ml-1.5 flex-1 text-xs leading-4',
                                error ? 'text-destructive' : 'text-muted-foreground'
                            )}
                            accessibilityRole={error ? 'alert' : undefined}
                        >
                            {describedText}
                        </Text>
                    </View>
                ) : null}
            </View>
        );
    }
);

Input.displayName = 'Input';