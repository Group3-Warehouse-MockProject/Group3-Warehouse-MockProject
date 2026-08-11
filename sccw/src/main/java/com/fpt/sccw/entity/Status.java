package com.fpt.sccw.entity;

public class Status{

    public enum ReceiptStatus{
        PENDING,
        APPROVED,
        REJECTED,
        COMPLETED,
        CANCELLED
    }

    public enum TransferType{
        CROSS_WAREHOUSE,
        INTERNAL_WAREHOUSE
    }

    public enum TransactionType{
        INBOUND,
        OUTBOUND
    }

    public enum TransactionStatus{
        PENDING,
        DELIVERING,
        DELIVERED,
        COMPLETED,
        CANCELLED
    }

    public enum InventoryCheckStatus {
        PENDING,
        IN_PROGRESS,
        COMPLETED,
        CANCELLED,
        RETURNED
    }

    public enum DocumentType {
        TRANSFER,
        INVENTORY_CHECK,
        WAREHOUSE_RECEIPT
    }

    public enum PaymentStatus {
        UNPAID,
        PARTIAL,
        PAID
    }

    public enum PaymentTerm {
        PREPAID,
        COD,
        DEBT
    }

    public enum PaymentMethod {
        CASH,
        BANK_TRANSFER,
        CARD,
        OTHER
    }

    public enum WarehouseStatus {
        ACTIVE,
        INACTIVE
    }

    public enum LocationStatus {
        ACTIVE,
        INACTIVE
    }

    public enum SupplierStatus {
        ACTIVE,
        INACTIVE
    }

    public enum NotificationType {
        SUCCESS,
        INFO,
        WARNING,
        ERROR
    }
}
