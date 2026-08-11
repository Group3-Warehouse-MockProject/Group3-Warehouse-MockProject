package com.fpt.sccw.dto.response;

import com.fpt.sccw.entity.Inventory;
import com.fpt.sccw.entity.Location;
import com.fpt.sccw.entity.Product;
import com.fpt.sccw.entity.Warehouse;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LocationDTO {
    private Long id;
    private String rackCode;
    private String binCode;
    private String status;
    private String effectiveStatus;
    private Long maxCapacity;
    private Long currentQuantity;
    private String warehouseId;
    private String warehouseName;
    private String warehouseCode;
    private List<LocationItemDTO> items;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LocationItemDTO {
        private Long productId;
        private String productSku;
        private String productName;
        private Long quantity;
        private String category;
        private String brand;
        private BigDecimal price;
        private BigDecimal cost;
        private String imageUrl;
        private Long lowStockThreshold;
    }

    public static LocationDTO fromEntity(Location location) {
        Long totalQty = 0L;
        String wId = null;
        String wName = null;
        String wCode = null;
        String whStatus = "ACTIVE";

        if (location.getWarehouse() != null) {
            Warehouse w = location.getWarehouse();
            wId = String.valueOf(w.getId());
            wName = w.getWarehouseName();
            wCode = w.getCode();
            whStatus = w.getStatus() != null ? w.getStatus().name() : "ACTIVE";
        }

        List<LocationItemDTO> itemList = new ArrayList<>();

        if (location.getInventories() != null && !location.getInventories().isEmpty()) {
            for (Inventory inv : location.getInventories()) {
                if (inv.getQuantity() != null) {
                    totalQty += inv.getQuantity();
                }
                if (wId == null && inv.getWarehouse() != null) {
                    Warehouse w = inv.getWarehouse();
                    wId = String.valueOf(w.getId());
                    wName = w.getWarehouseName();
                    wCode = w.getCode();
                    whStatus = w.getStatus() != null ? w.getStatus().name() : "ACTIVE";
                }

                Product p = inv.getProduct();
                if (p != null) {
                    itemList.add(LocationItemDTO.builder()
                            .productId(p.getId())
                            .productSku(p.getCode())
                            .productName(p.getName())
                            .quantity(inv.getQuantity())
                            .category(p.getCategory() != null ? p.getCategory().getName() : "")
                            .brand(p.getSupplier() != null ? p.getSupplier().getName() : "")
                            .price(p.getPrice())
                            .cost(p.getCost())
                            .imageUrl(p.getImageUrl())
                            .lowStockThreshold(inv.getLowStockThreshold())
                            .build());
                }
            }
        }

        String effStatus = "ACTIVE";
        if (location.getStatus() == com.fpt.sccw.entity.Status.LocationStatus.INACTIVE || "INACTIVE".equalsIgnoreCase(whStatus)) {
            effStatus = "INACTIVE";
        }

        return LocationDTO.builder()
                .id(location.getId())
                .rackCode(location.getRackCode())
                .binCode(location.getBinCode())
                .status(location.getStatus() != null ? location.getStatus().name() : "ACTIVE")
                .effectiveStatus(effStatus)
                .maxCapacity(location.getMaxCapacity())
                .currentQuantity(totalQty)
                .warehouseId(wId)
                .warehouseName(wName)
                .warehouseCode(wCode)
                .items(itemList)
                .build();
    }
}
