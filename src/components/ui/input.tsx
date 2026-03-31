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
}

export function Input({ className, label, error, ...props }: InputProps) {
    return (
        <View className="mb-4 space-y-2">
            {label && <Text className="text-sm font-medium text-foreground">{label}</Text>}
            <TextInput
                className={cn(
                    "flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus:border-primary",
                    error && "border-error",
                    className
                )}
                placeholderTextColor="hsl(220 9% 46%)" // muted-foreground
                {...props}
            />
            {error && <Text className="text-xs text-error">{error}</Text>}
        </View>
    );
}
