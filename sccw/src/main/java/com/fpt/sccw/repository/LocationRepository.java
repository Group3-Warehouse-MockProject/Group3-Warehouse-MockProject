package com.fpt.sccw.repository;

import com.fpt.sccw.entity.Location;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface LocationRepository extends JpaRepository<Location, Long> {
    Optional<Location> findFirstByWarehouseIdAndRackCodeIgnoreCaseAndBinCodeIgnoreCase(
            Long warehouseId, String rackCode, String binCode);

    boolean existsByWarehouseIdAndRackCodeIgnoreCaseAndBinCodeIgnoreCase(
            Long warehouseId, String rackCode, String binCode);
}
