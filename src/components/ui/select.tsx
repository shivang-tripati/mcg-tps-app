import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { LucideChevronRight } from 'lucide-react-native';

interface SelectOption {
    id: string;
    label: string;
    subtitle?: string;
}

interface SelectProps {
    label: string;
    options: SelectOption[];
    value?: string;
    onSelect: (id: string) => void;
    placeholder?: string;
    error?: string;
}

export function Select({ label, options, value, onSelect, placeholder, error }: SelectProps) {
    const selectedOption = options.find(opt => opt.id === value);

    return (
        <View className="mb-4">
            <Text className="text-sm font-medium text-foreground mb-2">{label}</Text>
            <View className="border border-input rounded-md bg-background">
                <FlatList
                    data={options}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            className={`p-4 border-b border-border flex-row items-center justify-between ${value === item.id ? 'bg-primary/10' : ''
                                }`}
                            onPress={() => onSelect(item.id)}
                        >
                            <View className="flex-1">
                                <Text className={`text-base ${value === item.id ? 'text-primary font-semibold' : 'text-foreground'}`}>
                                    {item.label}
                                </Text>
                                {item.subtitle && (
                                    <Text className="text-sm text-muted-foreground mt-1">{item.subtitle}</Text>
                                )}
                            </View>
                            {value === item.id && <LucideChevronRight size={20} color="hsl(325 45% 32%)" />}
                        </TouchableOpacity>
                    )}
                    ListEmptyComponent={
                        <View className="p-4">
                            <Text className="text-muted-foreground text-center">{placeholder || 'No options available'}</Text>
                        </View>
                    }
                    scrollEnabled={false}
                />
            </View>
            {error && <Text className="text-xs text-error mt-1">{error}</Text>}
        </View>
    );
}
