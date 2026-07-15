import React from 'react';
import { Text, View } from 'react-native';
import { PRIMARY } from '../../data/contant'

interface SectionHeaderProps {
  icon: React.ComponentType<{
    size?: number;
    color?: string;
  }>;
  title: string;
  rightElement?: React.ReactNode;
  className?: string;
}

export default function SectionHeader({
  icon: Icon,
  title,
  rightElement,
  className = '',
}: SectionHeaderProps) {
  return (
    <View
      className={`mb-4 flex-row items-center ${className}`}
    >
      <View
        className="mr-3 h-9 w-9 items-center justify-center rounded-xl"
        style={{
          backgroundColor: `${PRIMARY}12`,
        }}
      >
        <Icon size={18} color={PRIMARY} />
      </View>

      <Text
        className="flex-1 text-base font-bold text-foreground"
        numberOfLines={2}
      >
        {title}
      </Text>

      {rightElement ? (
        <View className="ml-3">
          {rightElement}
        </View>
      ) : null}
    </View>
  );
}