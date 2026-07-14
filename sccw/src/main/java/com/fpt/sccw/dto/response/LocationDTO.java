package com.fpt.sccw.dto.response;

import com.fpt.sccw.entity.Location;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class LocationDTO {
    private Long id;
    private String zoneCode;
    private String rackCode;
    private String binCode;
    private String status;
    private Long maxCapacity;

    public static LocationDTO fromEntity(Location location) {
        return LocationDTO.builder()
                .id(location.getId())
                .zoneCode(location.getZoneCode())
                .rackCode(location.getRackCode())
                .binCode(location.getBinCode())
                .status(location.getStatus())
                .maxCapacity(location.getMaxCapacity())
                .build();
    }
}
