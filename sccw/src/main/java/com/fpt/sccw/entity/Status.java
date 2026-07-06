package com.fpt.sccw.entity;

public class Status{

    public enum StockTransactionType {
        IN,
        OUT
    }

    public enum ProductStatus{
        IN_STOCK,
        LOW_STOCK,
        OUT_STOCK
    }

    public enum ReceiptStatus{
        PENDING,
        APPROVED,
        REJECTED
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
