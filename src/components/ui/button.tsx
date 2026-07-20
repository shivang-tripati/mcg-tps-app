import * as React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, GestureResponderEvent, View } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as Haptics from 'expo-haptics';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const buttonVariants = cva(
    "flex-row items-center justify-center rounded-md px-4 py-3 active:opacity-80",
    {
        variants: {
            variant: {
                default: "bg-primary",
                secondary: "border border-border bg-secondary",
                outline: "border border-input bg-background",
                ghost: "bg-transparent",
                link: "bg-transparent underline",
                destructive: "bg-destructive",
            },
            size: {
                default: "h-12",
                sm: "h-9 px-3",
                lg: "h-14 px-8",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

const textVariants = cva(
    "font-medium text-base",
    {
        variants: {
            variant: {
                default: "text-primary-foreground",
                secondary: "text-foreground",
                outline: "text-foreground",
                ghost: "text-foreground",
                link: "text-primary",
                destructive: "text-destructive-foreground",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
);

interface ButtonProps
    extends React.ComponentPropsWithoutRef<typeof TouchableOpacity>,
    VariantProps<typeof buttonVariants> {
    label?: string;
    loading?: boolean;
}

export function Button({
    className,
    variant,
    size,
    label,
    loading,
    disabled,
    children,
    onPress,
    ...props
}: ButtonProps) {
    // Determine loader color based on variant
    const loaderColor = (variant === 'outline' || variant === 'ghost' || variant === 'link' || variant === 'secondary')
        ? '#000000'
        : '#FFFFFF';

    const handlePress = React.useCallback((event: GestureResponderEvent) => {
        if (!disabled && !loading) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (onPress) {
                onPress(event);
            }
        }
    }, [disabled, loading, onPress]);

    // ✅ Get text color for label
    const textColor = (variant === 'outline' || variant === 'ghost' || variant === 'link' || variant === 'secondary')
        ? 'text-foreground'
        : 'text-primary-foreground';

    return (
        <TouchableOpacity
            className={cn(buttonVariants({ variant, size, className }), (disabled || loading) && "opacity-50")}
            disabled={disabled || loading}
            activeOpacity={0.8}
            onPress={handlePress}
            accessible={true}
            accessibilityRole="button"
            accessibilityState={{ disabled: disabled || loading, busy: loading }}
            accessibilityLabel={label || props.accessibilityLabel}
            {...props}
        >
            {loading ? (
                <ActivityIndicator color={loaderColor} />
            ) : (
                <View className="flex-row items-center justify-center gap-2">
                    {children}
                    {label && (
                        <Text className={cn(textVariants({ variant }), children ? 'ml-1' : '')}>
                            {label}
                        </Text>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
}