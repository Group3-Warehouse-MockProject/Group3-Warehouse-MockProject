package com.fpt.sccw.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.fpt.sccw.dto.request.SupplierRequest;
import com.fpt.sccw.dto.response.SupplierDTO;
import com.fpt.sccw.entity.Product;
import com.fpt.sccw.entity.Supplier;
import com.fpt.sccw.repository.SupplierRepository;

@ExtendWith(MockitoExtension.class)
class SupplierServiceTests {

    @Mock
    private SupplierRepository supplierRepository;

    private SupplierService supplierService;

    @BeforeEach
    void setUp() {
        supplierService = new SupplierService(supplierRepository);
    }

    @Test
    void createSupplierNormalizesAndPersistsAllFields() {
        SupplierRequest request = request();
        when(supplierRepository.save(any(Supplier.class))).thenAnswer(invocation -> {
            Supplier supplier = invocation.getArgument(0);
            supplier.setId(99L);
            return supplier;
        });

        SupplierDTO result = supplierService.createSupplier(request);

        assertThat(result.getId()).isEqualTo(99L);
        assertThat(result.getEmail()).isEqualTo("demo@example.com");
        assertThat(result.getStatus()).isEqualTo("ACTIVE");
        assertThat(result.getRating()).isEqualByComparingTo("4.7");
        assertThat(result.getOnTimeDelivery()).isEqualTo(96);
        verify(supplierRepository).save(any(Supplier.class));
    }

    @Test
    void duplicateEmailIsRejected() {
        SupplierRequest request = request();
        when(supplierRepository.existsByEmailIgnoreCase("demo@example.com")).thenReturn(true);

        assertThatThrownBy(() -> supplierService.createSupplier(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("email already exists");
        verify(supplierRepository, never()).save(any());
    }

    @Test
    void linkedSupplierCannotBeDeleted() {
        Supplier supplier = supplier();
        supplier.getProducts().add(new Product());
        when(supplierRepository.findById(1L)).thenReturn(Optional.of(supplier));

        assertThatThrownBy(() -> supplierService.deleteSupplier(1L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Deactivate");
        verify(supplierRepository, never()).delete(any());
    }

    @Test
    void statusCanBeChanged() {
        Supplier supplier = supplier();
        when(supplierRepository.findById(1L)).thenReturn(Optional.of(supplier));
        when(supplierRepository.save(supplier)).thenReturn(supplier);

        SupplierDTO result = supplierService.setSupplierStatus(1L, "inactive");

        assertThat(result.getStatus()).isEqualTo("INACTIVE");
    }

    private SupplierRequest request() {
        return SupplierRequest.builder()
                .name(" Demo Supplier ")
                .email(" DEMO@EXAMPLE.COM ")
                .phoneNumber(" +84 900 000 001 ")
                .address(" Ho Chi Minh City ")
                .country(" Vietnam ")
                .contactPerson(" Demo Contact ")
                .categories(" GPU, CPU ")
                .rating(new BigDecimal("4.7"))
                .onTimeDelivery(96)
                .notes(" Net 30 ")
                .build();
    }

    private Supplier supplier() {
        Supplier supplier = Supplier.builder()
                .name("Demo Supplier")
                .email("demo@example.com")
                .phoneNumber("+84 900 000 001")
                .address("Ho Chi Minh City")
                .country("Vietnam")
                .status("ACTIVE")
                .rating(new BigDecimal("4.7"))
                .onTimeDelivery(96)
                .products(new ArrayList<>())
                .build();
        supplier.setId(1L);
        return supplier;
    }
}
