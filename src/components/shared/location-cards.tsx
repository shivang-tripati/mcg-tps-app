import React, { useMemo } from 'react';
import {
    LucideBuilding2,
    LucideFactory,
    LucideHash,
    LucideMapPin,
    LucideUserRound,
} from 'lucide-react-native';

import { Card, InfoRow, SectionHeader } from './card';
import { PermitDetail } from '../../types/permits';
import { useAuth } from '../../lib/auth-store';

interface LocationCardsProps {
    permit: PermitDetail;
}

/**
 * Extends PermitDetail only inside this component so it remains compatible
 * even when some role/company properties have not yet been added to the
 * shared PermitDetail interface.
 */
type RoleAwarePermitDetail = PermitDetail & {
    companyId?: string | null;
    projectId?: string | null;

    company?: {
        id?: string;
        name?: string | null;
    } | null;

    user?: {
        id?: string;
        name?: string | null;
        email?: string | null;
        role?: string | null;
    } | null;

    project?: {
        id?: string;
        name?: string | null;
        address?: string | null;
        city?: string | null;
        state?: string | null;
        pincode?: string | null;

        company?: {
            id?: string;
            name?: string | null;
        } | null;
    } | null;

    plant?: {
        id?: string;
        name?: string | null;
        code?: string | null;
        address?: string | null;
        city?: string | null;
        state?: string | null;
        pincode?: string | null;
    } | null;
};

function joinAddress(
    parts: Array<string | null | undefined>
): string {
    return parts
        .map((part) => part?.trim())
        .filter((part): part is string => Boolean(part))
        .join(', ');
}

export function LocationCards({
    permit,
}: LocationCardsProps) {
    const { user: loggedInUser } = useAuth();

    const detail =
        permit as RoleAwarePermitDetail;

    const pickupAddress = useMemo(
        () =>
            joinAddress([
                detail.pickupAddress,
                detail.pickupCity,
                detail.pickupState,
                detail.pickupPincode,
            ]),
        [
            detail.pickupAddress,
            detail.pickupCity,
            detail.pickupState,
            detail.pickupPincode,
        ]
    );

    const projectAddress = useMemo(
        () =>
            joinAddress([
                detail.project?.address,
                detail.project?.city,
                detail.project?.state,
                detail.project?.pincode,
            ]),
        [
            detail.project?.address,
            detail.project?.city,
            detail.project?.state,
            detail.project?.pincode,
        ]
    );

    const plantAddress = useMemo(
        () =>
            joinAddress([
                detail.plant?.address,
                detail.plant?.city,
                detail.plant?.state,
                detail.plant?.pincode,
            ]),
        [
            detail.plant?.address,
            detail.plant?.city,
            detail.plant?.state,
            detail.plant?.pincode,
        ]
    );

    const permitOwnerRole =
        detail.user?.role?.toUpperCase();

    const loggedInRole =
        loggedInUser?.role?.toUpperCase();

    const loggedInUserOwnsPermit =
        Boolean(
            loggedInUser?.id &&
            detail.user?.id &&
            loggedInUser.id === detail.user.id
        );

    /**
     * Determine the permit type from the permit itself first.
     *
     * Logged-in role is only used as a fallback when the logged-in user
     * owns this permit and the permit response does not include owner role.
     */
    const isCompanyPermit = Boolean(
        permitOwnerRole === 'COMPANY_USER' ||
        detail.companyId ||
        detail.company ||
        detail.projectId ||
        detail.project ||
        (
            loggedInUserOwnsPermit &&
            loggedInRole === 'COMPANY_USER'
        )
    );

    const companyName =
        detail.company?.name ||
        detail.project?.company?.name ||
        'N/A';

    const projectName =
        detail.project?.name ||
        'N/A';

    const finalPickupAddress =
        pickupAddress ||
        projectAddress ||
        'N/A';

    return (
        <>
            <Card>
                <SectionHeader
                    icon={
                        isCompanyPermit
                            ? LucideBuilding2
                            : LucideMapPin
                    }
                    title={
                        isCompanyPermit
                            ? 'Project Pickup Location'
                            : 'Pickup Location'
                    }
                />

                {isCompanyPermit ? (
                    <>
                        <InfoRow
                            label="Project"
                            value={projectName}
                            icon={LucideBuilding2}
                        />

                        <InfoRow
                            label="Company"
                            value={companyName}
                            icon={LucideBuilding2}
                        />

                        {projectAddress &&
                        projectAddress !== pickupAddress ? (
                            <InfoRow
                                label="Project Address"
                                value={projectAddress}
                                icon={LucideMapPin}
                            />
                        ) : null}

                        <InfoRow
                            label="Pickup Address"
                            value={finalPickupAddress}
                            icon={LucideMapPin}
                            last
                        />
                    </>
                ) : (
                    <>
                        <InfoRow
                            label="Pickup Type"
                            value="Individual Pickup"
                            icon={LucideUserRound}
                        />

                        <InfoRow
                            label="Pickup Address"
                            value={finalPickupAddress}
                            icon={LucideMapPin}
                            last
                        />
                    </>
                )}
            </Card>

            <Card>
                <SectionHeader
                    icon={LucideFactory}
                    title="Destination Plant"
                />

                <InfoRow
                    label="Plant"
                    value={
                        detail.plant?.name ||
                        'N/A'
                    }
                    icon={LucideFactory}
                />

                <InfoRow
                    label="Code"
                    value={
                        detail.plant?.code ||
                        'N/A'
                    }
                    icon={LucideHash}
                />

                <InfoRow
                    label="Address"
                    value={
                        plantAddress ||
                        'N/A'
                    }
                    icon={LucideMapPin}
                    last
                />
            </Card>
        </>
    );
}
