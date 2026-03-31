// src/types/database.ts

export enum UserRole {
    ADMIN = "ADMIN",
    COMPANY_USER = "COMPANY_USER",
    INDIVIDUAL = "INDIVIDUAL",
    GUEST = "GUEST",
}

export enum PermitStatus {
    DRAFT = "DRAFT",
    SUBMITTED = "SUBMITTED",
    UNDER_REVIEW = "UNDER_REVIEW",
    APPROVED = "APPROVED",
    IN_TRANSIT = "IN_TRANSIT",
    COMPLETED = "COMPLETED",
    EXPIRED = "EXPIRED",
    REJECTED = "REJECTED",
    CANCELLED = "CANCELLED",
}

export enum WeighmentStatus {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
}

export enum WasteType {
    CND_SEGREGATED = "CND_SEGREGATED",
    CND_UNSEGREGATED = "CND_UNSEGREGATED",
}

export enum PaymentStatus {
    PENDING = "PENDING",
    PAID = "PAID",
    FAILED = "FAILED",
    REFUNDED = "REFUNDED",
}

export enum DocumentType {
    AADHAAR = "AADHAAR",
    PAN = "PAN",
}

export enum NotificationType {
    SMS = "SMS",
    EMAIL = "EMAIL",
    WHATSAPP = "WHATSAPP",
}

export enum NotificationStatus {
    PENDING = "PENDING",
    SENT = "SENT",
    FAILED = "FAILED",
}

export enum NotificationPriority {
    CRITICAL = "CRITICAL",
    STANDARD = "STANDARD",
    TRANSIENT = "TRANSIENT",
}

export enum AuditAction {
    CREATED = "CREATED",
    UPDATED = "UPDATED",
    SUBMITTED = "SUBMITTED",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    CANCELLED = "CANCELLED",
    IN_TRANSIT = "IN_TRANSIT",
    COMPLETED = "COMPLETED",
    EXPIRED = "EXPIRED",
    PAID = "PAID",
    DELETED = "DELETED",
}

export enum EntityType {
    USER = "USER",
    COMPANY = "COMPANY",
    PROJECT = "PROJECT",
    PLANT = "PLANT",
    PERMIT = "PERMIT",
    WEIGHMENT = "WEIGHMENT",
    NOTIFICATION = "NOTIFICATION",
}