import { forwardRef } from 'react';
import { TextInput, View, Text } from 'react-native';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface InputProps extends React.ComponentPropsWithoutRef<typeof TextInput> {
    label?: string;
    error?: string;
    className?: string;
    rightElement?: React.ReactNode;
}

export const Input = forwardRef<TextInput, InputProps>(({ className, label, error, rightElement, ...props }, ref) => {
    return (
        <View className="mb-4 space-y-2">
            {label && <Text className="text-sm font-medium text-foreground">{label}</Text>}
            <View className="relative justify-center">
                <TextInput
                    ref={ref}
                    className={cn(
                        "flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus:border-primary",
                        rightElement && "pr-12",
                        error && "border-error",
                        className
                    )}
                    placeholderTextColor="hsl(220 9% 46%)" // muted-foreground
                    accessible={true}
                    accessibilityLabel={props.accessibilityLabel || label || props.placeholder}
                    accessibilityHint={error ? `Error: ${error}` : props.accessibilityHint}
                    aria-invalid={!!error}
                    {...props}
                />
                {rightElement && (
                    <View className="absolute right-3">
                        {rightElement}
                    </View>
                )}
            </View>
            {error && <Text className="text-xs text-error" accessibilityRole="alert">{error}</Text>}
        </View>
    );
});

Input.displayName = "Input";
