import React from 'react';
import { LucideTruck, LucideUser } from 'lucide-react-native';
import { Card, SectionHeader, InfoRow } from './card';
import { PermitDetail } from '../../types/permits';

export function VehicleCard({ permit }: { permit: PermitDetail }) {
  const hasTransportInfo =
    permit.vehicleNumber ||
    permit.vehicleType ||
    permit.driverName ||
    permit.driverPhone;

  if (!hasTransportInfo) return null;

  return (
    <Card>
      <SectionHeader icon={LucideTruck} title="Transporter & Vehicle" />

      <InfoRow label="Vehicle Number" value={permit.vehicleNumber} icon={LucideTruck} />
      <InfoRow label="Vehicle Type" value={permit.vehicleType} icon={LucideTruck} />
      <InfoRow label="Driver Name" value={permit.driverName} icon={LucideUser} />
      <InfoRow label="Driver Phone" value={permit.driverPhone} icon={LucideUser} last />
    </Card>
  );
}
