import * as React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const buttonVariants = cva(
    "flex-row items-center justify-center rounded-md px-4 py-3",
    {
        variants: {
            variant: {
                default: "bg-primary",
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

// Fixed the interface definition here
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
    ...props
}: ButtonProps) {
    // Determine loader color based on variant
    const loaderColor = (variant === 'outline' || variant === 'ghost' || variant === 'link')
        ? '#000000'
        : '#FFFFFF';

    return (
        <TouchableOpacity
            className={cn(buttonVariants({ variant, size, className }), (disabled || loading) && "opacity-50")}
            disabled={disabled || loading}
            activeOpacity={0.8}
            {...props}
        >
            {loading ? (
                <ActivityIndicator color={loaderColor} />
            ) : (
                children || <Text className={cn(textVariants({ variant }))}>{label}</Text>
            )}
        </TouchableOpacity>
    );
}