import React from 'react';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';

interface DumpTruckProps {
  width?: number | string;
  height?: number | string;
  // Allow passing the current theme color for dark mode compatibility
  primaryColor?: string; 
}

export const DumpTruckSvg: React.FC<DumpTruckProps> = ({ 
  width = "100%", 
  height = "100%",
  primaryColor = "#9E2A46" // Default maroon if theme isn't passed
}) => (
  <Svg viewBox="0 0 400 250" width={width} height={height} fill="none">
    {/* Debris/Rocks */}
    <G fill="#8F9779" opacity={0.9}>
      <Path d="M120 100 L140 85 L160 105 L130 115 Z" />
      <Path d="M150 90 L170 75 L190 95 L160 105 Z" />
      <Path d="M180 85 L200 70 L220 90 L190 100 Z" />
      <Path d="M130 110 L150 95 L170 115 L140 125 Z" />
      <Path d="M160 100 L180 85 L200 105 L170 115 Z" />
      <Path d="M190 95 L210 80 L230 100 L200 110 Z" />
    </G>

    {/* Truck Body - Uses primaryColor prop instead of className */}
    <Path 
      d="M100 180 L100 120 L280 120 L280 180 Z" 
      fill={primaryColor}
    />
    
    {/* Truck Cab */}
    <Path 
      d="M280 180 L280 110 L340 110 L360 140 L360 180 Z" 
      fill="#FFFFFF" 
      stroke="#E5E7EB" 
      strokeWidth={2}
    />
    
    {/* Window */}
    <Path 
      d="M290 120 L330 120 L345 140 L290 140 Z" 
      fill="#1F2937" 
      opacity={0.8}
    />

    {/* Chassis/Bumper */}
    <Rect x="90" y="175" width="280" height="15" rx={4} fill="#374151" />
    <Rect x="355" y="160" width="10" height="25" rx={2} fill="#374151" />

    {/* Wheels */}
    <Circle cx="140" cy="190" r="25" fill="#1F2937" />
    <Circle cx="140" cy="190" r="12" fill="#D1D5DB" />
    
    <Circle cx="220" cy="190" r="25" fill="#1F2937" />
    <Circle cx="220" cy="190" r="12" fill="#D1D5DB" />
    
    <Circle cx="320" cy="190" r="25" fill="#1F2937" />
    <Circle cx="320" cy="190" r="12" fill="#D1D5DB" />

    {/* Headlight */}
    <Rect x="355" y="150" width="8" height="12" rx={2} fill="#FEF3C7" />
  </Svg>
);