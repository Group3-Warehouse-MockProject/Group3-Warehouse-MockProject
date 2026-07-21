package com.fpt.sccw.service;

import java.math.BigDecimal;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fpt.sccw.dto.request.SupplierRequest;
import com.fpt.sccw.dto.response.SupplierDTO;
import com.fpt.sccw.entity.Supplier;
import com.fpt.sccw.repository.SupplierRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional
public class SupplierService {

    private final SupplierRepository supplierRepository;

    @Transactional(readOnly = true)
    public List<SupplierDTO> getSuppliers(String query, String status) {
        String normalizedQuery = normalize(query);
        String normalizedStatus = normalize(status);

        return supplierRepository.findAll().stream()
                .filter(supplier -> normalizedStatus == null
                        || supplier.getStatus().equalsIgnoreCase(normalizedStatus))
                .filter(supplier -> normalizedQuery == null || matches(supplier, normalizedQuery))
                .sorted(Comparator.comparing(Supplier::getName, String.CASE_INSENSITIVE_ORDER))
                .map(SupplierDTO::fromEntity)
                .toList();
    }

    @Transactional(readOnly = true)
    public SupplierDTO getSupplier(Long id) {
        return SupplierDTO.fromEntity(findSupplier(id));
    }

    public SupplierDTO createSupplier(SupplierRequest request) {
        validateUniqueFields(request, null);
        Supplier supplier = new Supplier();
        applyRequest(supplier, request);
        supplier.setStatus(request.getStatus() != null ? request.getStatus() : "ACTIVE");
        return SupplierDTO.fromEntity(supplierRepository.save(supplier));
    }

    public SupplierDTO updateSupplier(Long id, SupplierRequest request) {
        Supplier supplier = findSupplier(id);
        validateUniqueFields(request, id);
        applyRequest(supplier, request);
        if (request.getStatus() != null) {
            supplier.setStatus(request.getStatus());
        }
        return SupplierDTO.fromEntity(supplierRepository.save(supplier));
    }

    public SupplierDTO setSupplierStatus(Long id, String status) {
        if (!"ACTIVE".equalsIgnoreCase(status) && !"INACTIVE".equalsIgnoreCase(status)) {
            throw new IllegalArgumentException("Status must be ACTIVE or INACTIVE");
        }
        Supplier supplier = findSupplier(id);
        supplier.setStatus(status.toUpperCase(Locale.ROOT));
        return SupplierDTO.fromEntity(supplierRepository.save(supplier));
    }

    public void deleteSupplier(Long id) {
        Supplier supplier = findSupplier(id);
        if (supplier.getProducts() != null && !supplier.getProducts().isEmpty()) {
            throw new IllegalStateException(
                    "Cannot delete a supplier linked to products. Deactivate the supplier instead.");
        }
        supplierRepository.delete(supplier);
    }

    private Supplier findSupplier(Long id) {
        return supplierRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Supplier not found with id: " + id));
    }

    private void validateUniqueFields(SupplierRequest request, Long id) {
        String normalizedEmail = request.getEmail().trim().toLowerCase(Locale.ROOT);
        String normalizedPhone = request.getPhoneNumber().trim();
        boolean duplicateEmail = id == null
                ? supplierRepository.existsByEmailIgnoreCase(normalizedEmail)
                : supplierRepository.existsByEmailIgnoreCaseAndIdNot(normalizedEmail, id);
        if (duplicateEmail) {
            throw new IllegalArgumentException("A supplier with this email already exists");
        }

        boolean duplicatePhone = id == null
                ? supplierRepository.existsByPhoneNumber(normalizedPhone)
                : supplierRepository.existsByPhoneNumberAndIdNot(normalizedPhone, id);
        if (duplicatePhone) {
            throw new IllegalArgumentException("A supplier with this phone number already exists");
        }
    }

    private void applyRequest(Supplier supplier, SupplierRequest request) {
        supplier.setName(request.getName().trim());
        supplier.setEmail(request.getEmail().trim().toLowerCase(Locale.ROOT));
        supplier.setPhoneNumber(request.getPhoneNumber().trim());
        supplier.setAddress(request.getAddress().trim());
        supplier.setCountry(request.getCountry().trim());
        supplier.setContactPerson(trimToNull(request.getContactPerson()));
        supplier.setCategories(trimToNull(request.getCategories()));
        supplier.setRating(request.getRating() != null ? request.getRating() : BigDecimal.ZERO);
        supplier.setOnTimeDelivery(request.getOnTimeDelivery() != null ? request.getOnTimeDelivery() : 0);
        supplier.setNotes(trimToNull(request.getNotes()));
    }

    private boolean matches(Supplier supplier, String query) {
        return contains(supplier.getName(), query)
                || contains(supplier.getEmail(), query)
                || contains(supplier.getPhoneNumber(), query)
                || contains(supplier.getAddress(), query)
                || contains(supplier.getCountry(), query)
                || contains(supplier.getContactPerson(), query)
                || contains(supplier.getCategories(), query);
    }

    private boolean contains(String value, String query) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(query);
    }

    private String normalize(String value) {
        return value == null || value.isBlank() ? null : value.trim().toLowerCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
