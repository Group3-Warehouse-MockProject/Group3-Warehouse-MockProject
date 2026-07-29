package com.fpt.sccw.controller;

import com.fpt.sccw.dto.response.LocationDTO;
import com.fpt.sccw.entity.Location;
import com.fpt.sccw.entity.Warehouse;
import com.fpt.sccw.repository.InventoryRepository;
import com.fpt.sccw.repository.LocationRepository;
import com.fpt.sccw.repository.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/locations")
@RequiredArgsConstructor
public class LocationController {

    private final LocationRepository locationRepository;
    private final InventoryRepository inventoryRepository;
    private final WarehouseRepository warehouseRepository;

    /** GET /api/locations — lấy tất cả, tuỳ chọn filter theo warehouseId, zoneCode, rackCode */
    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<LocationDTO>> getAllLocations(
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) String zoneCode,
            @RequestParam(required = false) String rackCode) {

        List<Location> locations = locationRepository.findAll();

        if (warehouseId != null) {
            locations = locations.stream()
                    .filter(l -> l.getWarehouse() != null && l.getWarehouse().getId().equals(warehouseId))
                    .collect(Collectors.toList());
        }
        if (zoneCode != null && !zoneCode.isBlank()) {
            locations = locations.stream()
                    .filter(l -> zoneCode.equalsIgnoreCase(l.getZoneCode()))
                    .collect(Collectors.toList());
        }
        if (rackCode != null && !rackCode.isBlank()) {
            locations = locations.stream()
                    .filter(l -> rackCode.equalsIgnoreCase(l.getRackCode()))
                    .collect(Collectors.toList());
        }

        List<LocationDTO> result = locations.stream()
                .map(LocationDTO::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    /** GET /api/locations/{id} */
    @GetMapping("/{id}")
    @Transactional(readOnly = true)
    public ResponseEntity<LocationDTO> getLocation(@PathVariable Long id) {
        return locationRepository.findById(id)
                .map(l -> ResponseEntity.ok(LocationDTO.fromEntity(l)))
                .orElse(ResponseEntity.notFound().build());
    }

    /** POST /api/locations — tạo mới location (bin) */
    @PostMapping
    @Transactional
    public ResponseEntity<?> createLocation(@RequestBody Map<String, Object> body) {
        String zoneCode    = getString(body, "zoneCode");
        String rackCode    = getString(body, "rackCode");
        String binCode     = getString(body, "binCode");
        String status      = getString(body, "status");
        Long maxCapacity   = getLong(body, "maxCapacity");
        Long warehouseId   = getLong(body, "warehouseId");

        if (rackCode == null || binCode == null) {
            return ResponseEntity.badRequest().body("rackCode and binCode are required");
        }

        Warehouse warehouse = null;
        if (warehouseId != null) {
            warehouse = warehouseRepository.findById(warehouseId).orElse(null);
        }

        // If zoneCode is not provided, default to warehouse code or "WH"
        if (zoneCode == null || zoneCode.isBlank()) {
            zoneCode = (warehouse != null && warehouse.getCode() != null) ? warehouse.getCode() : "WH";
        }

        final Long finalWarehouseId = warehouse != null ? warehouse.getId() : null;
        final String finalZoneCode = zoneCode;

        // Check duplicate within the same warehouse
        boolean exists = locationRepository.findAll().stream().anyMatch(l ->
                rackCode.equalsIgnoreCase(l.getRackCode()) &&
                binCode.equalsIgnoreCase(l.getBinCode()) &&
                ((finalWarehouseId == null && l.getWarehouse() == null) ||
                 (finalWarehouseId != null && l.getWarehouse() != null && l.getWarehouse().getId().equals(finalWarehouseId)))
        );
        if (exists) {
            return ResponseEntity.badRequest().body("Location Rack " + rackCode + " - Bin " + binCode + " already exists in this warehouse");
        }

        Location location = Location.builder()
                .zoneCode(finalZoneCode.toUpperCase())
                .rackCode(rackCode.toUpperCase())
                .binCode(binCode.toUpperCase())
                .status(status != null ? status.toUpperCase() : "ACTIVE")
                .maxCapacity(maxCapacity)
                .warehouse(warehouse)
                .build();

        Location saved = locationRepository.save(location);
        return ResponseEntity.ok(LocationDTO.fromEntity(saved));
    }

    /** PUT /api/locations/{id} — cập nhật location */
    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> updateLocation(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        Location location = locationRepository.findById(id).orElse(null);
        if (location == null) return ResponseEntity.notFound().build();

        String zoneCode    = getString(body, "zoneCode");
        String rackCode    = getString(body, "rackCode");
        String binCode     = getString(body, "binCode");
        String status      = getString(body, "status");
        Long maxCapacity   = getLong(body, "maxCapacity");
        Long warehouseId   = getLong(body, "warehouseId");

        if (warehouseId != null) {
            Warehouse warehouse = warehouseRepository.findById(warehouseId).orElse(null);
            location.setWarehouse(warehouse);
        }

        if (zoneCode != null && !zoneCode.isBlank()) {
            location.setZoneCode(zoneCode.toUpperCase());
        } else if (location.getWarehouse() != null && location.getWarehouse().getCode() != null) {
            location.setZoneCode(location.getWarehouse().getCode().toUpperCase());
        }

        if (rackCode  != null) location.setRackCode(rackCode.toUpperCase());
        if (binCode   != null) location.setBinCode(binCode.toUpperCase());
        if (status    != null) location.setStatus(status.toUpperCase());
        if (maxCapacity != null) location.setMaxCapacity(maxCapacity);

        Location saved = locationRepository.save(location);
        return ResponseEntity.ok(LocationDTO.fromEntity(saved));
    }

    /** PATCH /api/locations/{id}/status — toggle ACTIVE/INACTIVE cho 1 Bin */
    @PatchMapping("/{id}/status")
    @Transactional
    public ResponseEntity<?> toggleStatus(@PathVariable Long id) {
        Location location = locationRepository.findById(id).orElse(null);
        if (location == null) return ResponseEntity.notFound().build();

        String newStatus = "INACTIVE".equalsIgnoreCase(location.getStatus()) ? "ACTIVE" : "INACTIVE";
        location.setStatus(newStatus);
        Location saved = locationRepository.save(location);
        return ResponseEntity.ok(LocationDTO.fromEntity(saved));
    }

    /** PATCH /api/locations/racks/status — toggle ACTIVE/INACTIVE cho toàn bộ Rack trong Kho */
    @PatchMapping("/racks/status")
    @Transactional
    public ResponseEntity<?> toggleRackStatus(
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) String zoneCode,
            @RequestParam String rackCode,
            @RequestParam(required = false) String targetStatus) {

        List<Location> locations = locationRepository.findAll().stream()
                .filter(l -> (warehouseId == null || (l.getWarehouse() != null && l.getWarehouse().getId().equals(warehouseId)))
                        && (zoneCode == null || zoneCode.isBlank() || zoneCode.equalsIgnoreCase(l.getZoneCode()))
                        && rackCode.equalsIgnoreCase(l.getRackCode()))
                .collect(Collectors.toList());

        if (locations.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        String newStatus = targetStatus;
        if (newStatus == null || newStatus.isBlank()) {
            String currentStatus = locations.get(0).getStatus();
            newStatus = "INACTIVE".equalsIgnoreCase(currentStatus) ? "ACTIVE" : "INACTIVE";
        } else {
            newStatus = newStatus.toUpperCase();
        }

        for (Location loc : locations) {
            loc.setStatus(newStatus);
            locationRepository.save(loc);
        }

        List<LocationDTO> result = locations.stream()
                .map(LocationDTO::fromEntity)
                .collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    /** DELETE /api/locations/{id} */
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteLocation(@PathVariable Long id) {
        Location location = locationRepository.findById(id).orElse(null);
        if (location == null) return ResponseEntity.notFound().build();

        // Unlink inventories trước khi xóa
        inventoryRepository.findAll().stream()
                .filter(inv -> inv.getLocation() != null && inv.getLocation().getId().equals(id))
                .forEach(inv -> {
                    inv.setLocation(null);
                    inventoryRepository.save(inv);
                });

        locationRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Location deleted successfully"));
    }

    // ── helpers ──
    private String getString(Map<String, Object> body, String key) {
        Object v = body.get(key);
        return v != null ? v.toString().trim() : null;
    }

    private Long getLong(Map<String, Object> body, String key) {
        Object v = body.get(key);
        if (v == null) return null;
        try { return Long.parseLong(v.toString()); } catch (Exception e) { return null; }
    }
}
