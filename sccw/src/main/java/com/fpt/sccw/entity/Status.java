package com.fpt.sccw.entity;

public class Status{

    public enum StockTransactionType {
        IN,
        OUT
    }

    public enum ReceiptStatus{
        PENDING,
        APPROVED,
        REJECTED,
        COMPLETED,
        CANCELLED
    }

    public enum TransferType{
        Cross_Warehouse,
        Internal_Warehouse,
        INBOUND,
        OUTBOUND,
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
        CANCEL
    }

    public enum InventoryCheckStatus {
        PENDING,
        IN_PROGRESS,
        COMPLETED,
        CANCELLED
    }

    public enum DocumentType {
        TRANSFER,
        INVENTORY_CHECK,
        WAREHOUSE_RECEIPT
    }
}
