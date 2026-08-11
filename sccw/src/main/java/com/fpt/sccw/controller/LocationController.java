package com.fpt.sccw.controller;

import com.fpt.sccw.dto.response.LocationDTO;
import com.fpt.sccw.entity.Location;
import com.fpt.sccw.entity.User;
import com.fpt.sccw.entity.Warehouse;
import com.fpt.sccw.repository.InventoryRepository;
import com.fpt.sccw.repository.LocationRepository;
import com.fpt.sccw.repository.UserRepository;
import com.fpt.sccw.repository.WarehouseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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
    private final UserRepository userRepository;

    /** GET /api/locations — lấy tất cả, tuỳ chọn filter theo warehouseId, rackCode, status, occupancy */
    @GetMapping
    @Transactional(readOnly = true)
    public ResponseEntity<List<LocationDTO>> getAllLocations(
            @RequestParam(required = false) Long warehouseId,
            @RequestParam(required = false) String rackCode,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String occupancy) {

        List<Location> locations = locationRepository.findAll();

        if (warehouseId != null) {
            locations = locations.stream()
                    .filter(l -> l.getWarehouse() != null && l.getWarehouse().getId().equals(warehouseId))
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

        if (status != null && !status.isBlank()) {
            result = result.stream()
                    .filter(dto -> status.equalsIgnoreCase(dto.getEffectiveStatus()) || status.equalsIgnoreCase(dto.getStatus()))
                    .collect(Collectors.toList());
        }

        if (occupancy != null && !occupancy.isBlank()) {
            String occLower = occupancy.trim().toLowerCase();
            result = result.stream().filter(dto -> {
                long qty = dto.getCurrentQuantity() != null ? dto.getCurrentQuantity() : 0L;
                long cap = dto.getMaxCapacity() != null ? dto.getMaxCapacity() : 0L;
                if ("empty".equals(occLower)) {
                    return qty == 0;
                } else if ("occupied".equals(occLower)) {
                    return qty > 0;
                } else if ("full".equals(occLower)) {
                    return (cap > 0 && qty >= (cap * 0.8)) || (cap == 0 && qty > 0);
                }
                return true;
            }).collect(Collectors.toList());
        }

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
        String rackCode    = getString(body, "rackCode");
        String binCode     = getString(body, "binCode");
        String status      = getString(body, "status");
        Long maxCapacity   = getLong(body, "maxCapacity");
        Long warehouseId   = getLong(body, "warehouseId");

        ResponseEntity<?> permCheck = validateWritePermission(warehouseId);
        if (permCheck != null) return permCheck;

        if (rackCode == null || binCode == null) {
            return ResponseEntity.badRequest().body("rackCode and binCode are required");
        }
        if (warehouseId == null) {
            return ResponseEntity.badRequest().body("warehouseId is required");
        }

        Warehouse warehouse = warehouseRepository.findById(warehouseId).orElse(null);
        if (warehouse == null) {
            return ResponseEntity.badRequest().body("Warehouse not found with id: " + warehouseId);
        }

        // Check duplicate within the same warehouse
        boolean exists = locationRepository.existsByWarehouseIdAndRackCodeIgnoreCaseAndBinCodeIgnoreCase(
                warehouseId, rackCode.trim(), binCode.trim());
        if (exists) {
            return ResponseEntity.badRequest().body("Location Rack " + rackCode + " - Bin " + binCode + " already exists in this warehouse");
        }

        Location location = Location.builder()
                .rackCode(rackCode.trim().toUpperCase())
                .binCode(binCode.trim().toUpperCase())
                .status(status != null ? status.trim().toUpperCase() : "ACTIVE")
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

        String rackCode    = getString(body, "rackCode");
        String binCode     = getString(body, "binCode");
        String status      = getString(body, "status");
        Long maxCapacity   = getLong(body, "maxCapacity");
        Long warehouseId   = getLong(body, "warehouseId");

        Long targetWarehouseId = warehouseId != null ? warehouseId : (location.getWarehouse() != null ? location.getWarehouse().getId() : null);
        ResponseEntity<?> permCheck = validateWritePermission(targetWarehouseId);
        if (permCheck != null) return permCheck;

        Warehouse warehouse = location.getWarehouse();
        if (warehouseId != null) {
            warehouse = warehouseRepository.findById(warehouseId).orElse(null);
            if (warehouse == null) return ResponseEntity.badRequest().body("Warehouse not found with id: " + warehouseId);
            location.setWarehouse(warehouse);
        }

        String targetRack = rackCode != null ? rackCode.trim().toUpperCase() : location.getRackCode();
        String targetBin  = binCode  != null ? binCode.trim().toUpperCase()  : location.getBinCode();

        if (warehouse != null && (!targetRack.equalsIgnoreCase(location.getRackCode()) || !targetBin.equalsIgnoreCase(location.getBinCode()))) {
            boolean exists = locationRepository.existsByWarehouseIdAndRackCodeIgnoreCaseAndBinCodeIgnoreCase(
                    warehouse.getId(), targetRack, targetBin);
            if (exists) {
                return ResponseEntity.badRequest().body("Location Rack " + targetRack + " - Bin " + targetBin + " already exists in this warehouse");
            }
        }

        if (maxCapacity != null) {
            long currentStock = inventoryRepository.findAll().stream()
                    .filter(inv -> inv.getLocation() != null && inv.getLocation().getId().equals(id))
                    .mapToLong(inv -> inv.getQuantity() != null ? inv.getQuantity() : 0L).sum();
            if (maxCapacity < currentStock) {
                return ResponseEntity.badRequest().body("Location max capacity (" + maxCapacity + ") cannot be less than current stock (" + currentStock + ")");
            }
            location.setMaxCapacity(maxCapacity);
        }

        if (rackCode  != null) location.setRackCode(targetRack);
        if (binCode   != null) location.setBinCode(targetBin);
        if (status    != null) location.setStatus(status.trim().toUpperCase());

        Location saved = locationRepository.save(location);
        return ResponseEntity.ok(LocationDTO.fromEntity(saved));
    }

    /** PATCH /api/locations/{id}/status — toggle ACTIVE/INACTIVE cho 1 Bin */
    @PatchMapping("/{id}/status")
    @Transactional
    public ResponseEntity<?> toggleStatus(@PathVariable Long id) {
        Location location = locationRepository.findById(id).orElse(null);
        if (location == null) return ResponseEntity.notFound().build();

        Long targetWarehouseId = location.getWarehouse() != null ? location.getWarehouse().getId() : null;
        ResponseEntity<?> permCheck = validateWritePermission(targetWarehouseId);
        if (permCheck != null) return permCheck;

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
            @RequestParam String rackCode,
            @RequestParam(required = false) String targetStatus) {

        ResponseEntity<?> permCheck = validateWritePermission(warehouseId);
        if (permCheck != null) return permCheck;

        List<Location> locations = locationRepository.findAll().stream()
                .filter(l -> (warehouseId == null || (l.getWarehouse() != null && l.getWarehouse().getId().equals(warehouseId)))
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

    /** DELETE /api/locations/racks — xóa toàn bộ 1 Rack (chỉ khi tất cả các Bins trong Rack đều trống) */
    @DeleteMapping("/racks")
    @Transactional
    public ResponseEntity<?> deleteRack(
            @RequestParam(required = false) Long warehouseId,
            @RequestParam String rackCode) {

        if (rackCode == null || rackCode.isBlank()) {
            return ResponseEntity.badRequest().body("rackCode is required");
        }

        ResponseEntity<?> permCheck = validateWritePermission(warehouseId);
        if (permCheck != null) return permCheck;

        List<Location> locations = locationRepository.findAll().stream()
                .filter(l -> (warehouseId == null || (l.getWarehouse() != null && l.getWarehouse().getId().equals(warehouseId)))
                        && rackCode.equalsIgnoreCase(l.getRackCode()))
                .collect(Collectors.toList());

        if (locations.isEmpty()) {
            return ResponseEntity.notFound().build();
        }

        // Check if any location in this rack contains stock
        List<Long> locIds = locations.stream().map(Location::getId).collect(Collectors.toList());
        List<com.fpt.sccw.entity.Inventory> invList = inventoryRepository.findAll().stream()
                .filter(inv -> inv.getLocation() != null && locIds.contains(inv.getLocation().getId()))
                .collect(Collectors.toList());

        long totalQty = invList.stream().mapToLong(inv -> inv.getQuantity() != null ? inv.getQuantity() : 0L).sum();
        if (totalQty > 0) {
            return ResponseEntity.badRequest().body("Cannot delete Rack " + rackCode + ": Contains " + totalQty + " items in stock");
        }

        // Dissociate inventory records if any zero-qty inventory references exist
        invList.forEach(inv -> {
            inv.setLocation(null);
            inventoryRepository.save(inv);
        });

        // Delete all locations in this rack
        locationRepository.deleteAll(locations);

        return ResponseEntity.ok(Map.of("message", "Rack " + rackCode + " and its empty locations deleted successfully", "deletedCount", locations.size()));
    }

    /** DELETE /api/locations/{id} */
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> deleteLocation(@PathVariable Long id) {
        Location location = locationRepository.findById(id).orElse(null);
        if (location == null) return ResponseEntity.notFound().build();

        Long targetWarehouseId = location.getWarehouse() != null ? location.getWarehouse().getId() : null;
        ResponseEntity<?> permCheck = validateWritePermission(targetWarehouseId);
        if (permCheck != null) return permCheck;

        // Check if location currently contains stock
        List<com.fpt.sccw.entity.Inventory> invList = inventoryRepository.findAll().stream()
                .filter(inv -> inv.getLocation() != null && inv.getLocation().getId().equals(id))
                .collect(Collectors.toList());

        long totalQty = invList.stream().mapToLong(inv -> inv.getQuantity() != null ? inv.getQuantity() : 0L).sum();
        if (totalQty > 0) {
            return ResponseEntity.badRequest().body("Cannot delete location containing " + totalQty + " items in stock");
        }

        invList.forEach(inv -> {
            inv.setLocation(null);
            inventoryRepository.save(inv);
        });

        locationRepository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Location deleted successfully"));
    }

    // ── helpers ──
    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        String email = authentication.getName();
        return userRepository.findByEmail(email).orElse(null);
    }

    private ResponseEntity<?> validateWritePermission(Long targetWarehouseId) {
        User currentUser = getCurrentUser();
        if (currentUser == null) {
            return ResponseEntity.status(401).body("Unauthorized");
        }
        String roleName = currentUser.getRole() != null && currentUser.getRole().getRoleName() != null
                ? currentUser.getRole().getRoleName().name()
                : "";

        if ("STAFF".equalsIgnoreCase(roleName)) {
            return ResponseEntity.status(403).body("Staff users are not allowed to manage locations");
        }

        if ("WAREHOUSE_MANAGER".equalsIgnoreCase(roleName)) {
            Long assignedWarehouseId = currentUser.getWarehouse() != null ? currentUser.getWarehouse().getId() : null;
            if (targetWarehouseId != null && (assignedWarehouseId == null || !assignedWarehouseId.equals(targetWarehouseId))) {
                return ResponseEntity.status(403).body("Warehouse Managers can only manage locations in their assigned warehouse");
            }
        }

        return null;
    }

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
