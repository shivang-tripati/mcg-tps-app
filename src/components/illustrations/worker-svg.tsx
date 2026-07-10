
import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

interface WorkerProps {
  width?: number | string;
  height?: number | string;
  primaryColor?: string;
}

export const WorkerSvg: React.FC<WorkerProps> = ({ 
  width = "100%", 
  height = "100%",
  primaryColor = "#9E2A46"
}) => (
  <Svg viewBox="0 0 150 300" width={width} height={height} fill="none">
    {/* Hard Hat */}
    <Path 
      d="M55 60 C55 30 95 30 95 60 L100 65 L50 65 Z" 
      fill={primaryColor}
    />
    <Rect x="48" y="62" width="54" height="6" rx={3} fill={primaryColor} />

    {/* Head/Face */}
    <Circle cx="75" cy="75" r="18" fill="#FCA5A5" />

    {/* Body/Shirt */}
    <Path d="M55 95 L95 95 L100 160 L50 160 Z" fill="#374151" />

    {/* Safety Vest */}
    <Path 
      d="M55 95 L95 95 L90 140 L60 140 Z" 
      fill={primaryColor}
      opacity={0.9}
    />
    {/* Reflective Stripes */}
    <Rect x="58" y="110" width="34" height="4" fill="#FFFFFF" opacity={0.8} />
    <Rect x="56" y="125" width="38" height="4" fill="#FFFFFF" opacity={0.8} />

    {/* Legs/Pants */}
    <Path d="M60 160 L70 250 L50 250 L45 160 Z" fill="#1F2937" />
    <Path d="M80 160 L90 250 L70 250 L65 160 Z" fill="#1F2937" />

    {/* Shoes */}
    <Path d="M45 250 L70 250 L70 260 L40 260 Z" fill="#111827" />
    <Path d="M70 250 L95 250 L100 260 L70 260 Z" fill="#111827" />

    {/* Arm Holding Device */}
    <Path d="M95 100 L120 130 L110 140 L85 110 Z" fill="#374151" />
    
    {/* Hand */}
    <Circle cx="115" cy="135" r="8" fill="#FCA5A5" />

    {/* Device/Tablet */}
    <Rect x="105" y="120" width="20" height="30" rx={2} fill="#FFFFFF" stroke="#374151" strokeWidth={2} />
    <Rect x="108" y="123" width="14" height="20" fill="#E5E7EB" />
  </Svg>
);