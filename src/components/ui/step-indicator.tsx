import { View, Text, TouchableOpacity } from 'react-native';
import { LucideCheck } from 'lucide-react-native';

interface Step {
    number: number;
    title: string;
}

interface StepIndicatorProps {
    steps: Step[];
    currentStep: number;
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
    return (
        <View className="px-6 py-4 bg-card border-b border-border">
            <View className="flex-row items-center justify-between">
                {steps.map((step, index) => (
                    <View key={step.number} className="flex-1 flex-row items-center">
                        {/* Step Circle */}
                        <View className="items-center">
                            <View
                                className={`w-10 h-10 rounded-full items-center justify-center ${step.number < currentStep
                                        ? 'bg-success'
                                        : step.number === currentStep
                                            ? 'bg-primary'
                                            : 'bg-muted border-2 border-border'
                                    }`}
                            >
                                {step.number < currentStep ? (
                                    <LucideCheck size={20} color="white" />
                                ) : (
                                    <Text
                                        className={`font-semibold ${step.number === currentStep ? 'text-white' : 'text-muted-foreground'
                                            }`}
                                    >
                                        {step.number}
                                    </Text>
                                )}
                            </View>
                            <Text
                                className={`text-xs mt-1 text-center ${step.number === currentStep ? 'text-foreground font-semibold' : 'text-muted-foreground'
                                    }`}
                            >
                                {step.title}
                            </Text>
                        </View>

                        {/* Connector Line */}
                        {index < steps.length - 1 && (
                            <View
                                className={`flex-1 h-0.5 mx-2 ${step.number < currentStep ? 'bg-success' : 'bg-border'
                                    }`}
                            />
                        )}
                    </View>
                ))}
            </View>
        </View>
    );
}
