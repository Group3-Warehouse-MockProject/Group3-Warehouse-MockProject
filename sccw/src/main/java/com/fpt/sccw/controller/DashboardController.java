package com.fpt.sccw.controller;

import com.fpt.sccw.dto.response.DashboardDTO;
import com.fpt.sccw.repository.UserRepository;
import com.fpt.sccw.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DashboardController {

    private final DashboardService dashboardService;
    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<DashboardDTO> getDashboard(
            @RequestParam(required = false) Long warehouseIdParam
    ) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(401).build();
        }

        String email = authentication.getName();
        var user = userRepository.findByEmail(email).orElseThrow();
        String roleName = user.getRole().getRoleName().name();

        Long targetWarehouseId = null;

        if (roleName.equals("ADMIN") || roleName.equals("MANAGER")) {
            targetWarehouseId = warehouseIdParam;
        } else {
            targetWarehouseId = user.getWarehouse() != null ? user.getWarehouse().getId() : -1L;
            if (targetWarehouseId.equals(-1L)) {
                return ResponseEntity.ok(new DashboardDTO());
            }
        }

        DashboardDTO data = dashboardService.getDashboardData(targetWarehouseId);
        return ResponseEntity.ok(data);
    }
}
