package lk.sliit.web_based_construction_management_system.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import sliit.construction.construction.dto.SupplierDtos;

public interface SupplierService {

    SupplierDtos.Response create(SupplierDtos.Request r);

    Page<SupplierDtos.Response> list(String search, Pageable p);

    SupplierDtos.Response get(Long id);

    SupplierDtos.Response update(Long id, SupplierDtos.Request r);

    void delete(Long id);
}
