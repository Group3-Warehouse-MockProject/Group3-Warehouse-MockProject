package com.fpt.sccw.repository;

import com.fpt.sccw.entity.Location;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LocationRepository extends JpaRepository<Location, Long> {
}
