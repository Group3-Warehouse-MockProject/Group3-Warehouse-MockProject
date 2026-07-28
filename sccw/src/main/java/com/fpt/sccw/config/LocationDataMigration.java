package com.fpt.sccw.config;

import com.fpt.sccw.entity.Inventory;
import com.fpt.sccw.entity.Location;
import com.fpt.sccw.entity.Warehouse;
import com.fpt.sccw.repository.LocationRepository;
import com.fpt.sccw.repository.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class LocationDataMigration {

    private final LocationRepository locationRepository;
    private final WarehouseRepository warehouseRepository;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void migrateLocationWarehouseRelationship() {
        List<Location> locations = locationRepository.findAll();
        List<Warehouse> warehouses = warehouseRepository.findAll();

        if (locations.isEmpty() || warehouses.isEmpty()) {
            return;
        }

        Warehouse defaultWarehouse = warehouses.get(0);

        // 1. Ensure all locations have warehouse_id and zoneCode = warehouse.code
        for (Location loc : locations) {
            if (loc.getWarehouse() == null) {
                Warehouse matchedWarehouse = null;

                if (loc.getInventories() != null && !loc.getInventories().isEmpty()) {
                    for (Inventory inv : loc.getInventories()) {
                        if (inv.getWarehouse() != null) {
                            matchedWarehouse = inv.getWarehouse();
                            break;
                        }
                    }
                }

                if (matchedWarehouse == null) {
                    matchedWarehouse = defaultWarehouse;
                }

                loc.setWarehouse(matchedWarehouse);
            }

            // Sync zoneCode with Warehouse Code
            if (loc.getWarehouse() != null && loc.getWarehouse().getCode() != null) {
                loc.setZoneCode(loc.getWarehouse().getCode().toUpperCase());
            }
        }

        // 2. Clean up duplicate binCodes under each Rack in MySQL
        // Group locations by warehouseId -> rackCode
        Map<String, List<Location>> rackGroups = locations.stream()
                .collect(Collectors.groupingBy(loc -> {
                    String wId = loc.getWarehouse() != null ? String.valueOf(loc.getWarehouse().getId()) : "default";
                    String rCode = (loc.getRackCode() != null ? loc.getRackCode() : "01").toUpperCase();
                    return wId + "_" + rCode;
                }));

        int updatedCount = 0;

        for (Map.Entry<String, List<Location>> entry : rackGroups.entrySet()) {
            List<Location> binList = entry.getValue();
            // Sort by id to maintain deterministic order
            binList.sort(Comparator.comparing(Location::getId));

            int index = 1;
            for (Location loc : binList) {
                String newBinCode = String.format("%02d", index);
                if (!newBinCode.equalsIgnoreCase(loc.getBinCode())) {
                    loc.setBinCode(newBinCode);
                    updatedCount++;
                }
                index++;
            }

            locationRepository.saveAll(binList);
        }

        if (updatedCount > 0) {
            log.info("Cleaned up and re-indexed {} location bins in MySQL to guarantee unique Bin codes per Rack", updatedCount);
        }
    }
}
