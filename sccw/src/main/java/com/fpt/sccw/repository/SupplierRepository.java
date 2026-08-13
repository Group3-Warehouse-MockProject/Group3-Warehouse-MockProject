package com.fpt.sccw.repository;

import com.fpt.sccw.entity.Supplier;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.fpt.sccw.entity.Status;

public interface SupplierRepository extends JpaRepository<Supplier, Long> {
    boolean existsByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);

    boolean existsByPhoneNumber(String phoneNumber);

    boolean existsByPhoneNumberAndIdNot(String phoneNumber, Long id);

    @Query(value = "SELECT s FROM Supplier s " +
                   "WHERE (:search IS NULL OR LOWER(s.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(s.email) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(s.phoneNumber) LIKE LOWER(CONCAT('%', :search, '%'))) " +
                   "AND (:status IS NULL OR s.status = :status) " +
                   "AND (:country IS NULL OR s.country = :country)",
           countQuery = "SELECT COUNT(s) FROM Supplier s " +
                        "WHERE (:search IS NULL OR LOWER(s.name) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(s.email) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(s.phoneNumber) LIKE LOWER(CONCAT('%', :search, '%'))) " +
                        "AND (:status IS NULL OR s.status = :status) " +
                        "AND (:country IS NULL OR s.country = :country)")
    Page<Supplier> findSuppliersFiltered(@Param("search") String search,
                                         @Param("status") Status.SupplierStatus status,
                                         @Param("country") String country,
                                         Pageable pageable);
    @Query("SELECT COALESCE(AVG(s.rating), 0.0) FROM Supplier s")
    double getAverageRating();

    @Query("SELECT COALESCE(AVG(s.onTimeDelivery), 0.0) FROM Supplier s")
    double getAverageOnTimeDelivery();

    @Query("SELECT COUNT(DISTINCT s.country) FROM Supplier s WHERE s.country IS NOT NULL AND s.country != ''")
    long countDistinctCountries();
}
