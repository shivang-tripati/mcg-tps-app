import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LucideAlertTriangle, LucideRefreshCcw } from 'lucide-react-native';

export function ErrorState({
  message,
  onBack,
  onRetry,
}: {
  message: string;
  onBack: () => void;
  onRetry: () => void;
}) {
  return (
    <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
      <View className="w-16 h-16 rounded-full bg-red-50 items-center justify-center mb-4">
        <LucideAlertTriangle size={30} color="hsl(0 72% 38%)" />
      </View>

      <Text className="text-error text-lg font-bold text-center mb-2">
        Failed to load permit
      </Text>

      <Text className="text-muted-foreground text-sm text-center mb-6">
        {message}
      </Text>

      <TouchableOpacity
        className="bg-primary px-6 py-3 rounded-xl w-full items-center mb-3"
        onPress={onRetry}
      >
        <View className="flex-row items-center">
          <LucideRefreshCcw size={18} color="white" />
          <Text className="text-white font-semibold ml-2">Try Again</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        className="bg-card border border-border px-6 py-3 rounded-xl w-full items-center"
        onPress={onBack}
      >
        <Text className="text-foreground font-semibold">Go Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
