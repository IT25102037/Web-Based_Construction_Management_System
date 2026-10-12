package sliit.construction.construction.service;

import sliit.construction.construction.dto.SupplierDtos;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface SupplierService {

    SupplierDtos.Response create(SupplierDtos.Request r);

    Page<SupplierDtos.Response> list(String search, Pageable p);

    SupplierDtos.Response get(Long id);

    SupplierDtos.Response update(Long id, SupplierDtos.Request r);

    void delete(Long id);
}
