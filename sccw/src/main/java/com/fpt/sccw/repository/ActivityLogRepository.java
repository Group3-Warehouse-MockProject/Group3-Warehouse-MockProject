package com.fpt.sccw.repository;

import com.fpt.sccw.entity.ActivityLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {

    @Query("SELECT al FROM ActivityLog al LEFT JOIN al.user u WHERE " +
            "(:actionType IS NULL OR al.actionType = :actionType) AND " +
            "(:search IS NULL OR :search = '' OR " +
            "LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(u.username) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(COALESCE(al.pageUrl, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(COALESCE(al.ipAddress, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "LOWER(COALESCE(al.details, '')) LIKE LOWER(CONCAT('%', :search, '%')))"
    )
    Page<ActivityLog> findByFilters(@Param("actionType") String actionType, @Param("search") String search, Pageable pageable);

    Page<ActivityLog> findByUserIdOrderByTimestampDesc(Long userId, Pageable pageable);
}
