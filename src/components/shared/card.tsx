import React from 'react';
import { View, Text } from 'react-native';
import { PRIMARY, MUTED } from './helpers';

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <View className={`bg-card border border-border rounded-2xl p-4 mb-4 ${className}`}>
      {children}
    </View>
  );
}

export function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ size?: number; color?: string }>;
  title: string;
}) {
  return (
    <View className="flex-row items-center mb-4">
      <View className="w-9 h-9 rounded-xl items-center justify-center mr-3" style={{ backgroundColor: `${PRIMARY}12` }}>
        <Icon size={18} color={PRIMARY} />
      </View>
      <Text className="text-base font-bold text-foreground flex-1">{title}</Text>
    </View>
  );
}

export function InfoRow({
  label,
  value,
  icon: Icon,
  last = false,
}: {
  label: string;
  value?: string | number | null;
  icon?: React.ComponentType<{ size?: number; color?: string }>;
  last?: boolean;
}) {
  return (
    <View className={`flex-row items-start py-3 ${last ? '' : 'border-b border-border'}`}>
      {Icon ? <Icon size={18} color={MUTED} /> : null}

      <View className={Icon ? 'ml-3 flex-1' : 'flex-1'}>
        <Text className="text-xs text-muted-foreground mb-1">{label}</Text>
        <Text className="text-sm text-foreground font-medium">
          {value || 'N/A'}
        </Text>
      </View>
    </View>
  );
}
