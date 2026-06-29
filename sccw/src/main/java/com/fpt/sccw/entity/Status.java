package com.fpt.sccw.entity;

public class Status extends BaseEntity{

    public enum productStatus{
        IN_STOCK,
        LOW_STOCK,
        OUT_STOCK
    }

    public enum orderStatus{
        PENDING,
        DELIVERING,
        DELIVERED,
        COMPLETED,
        CANCEL
    }
}
