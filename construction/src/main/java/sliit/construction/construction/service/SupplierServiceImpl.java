package sliit.construction.construction.service;

import sliit.construction.construction.dto.SupplierDtos;
import sliit.construction.construction.entity.Supplier;
import sliit.construction.construction.exception.DuplicateResourceException;
import sliit.construction.construction.exception.ResourceNotFoundException;
import sliit.construction.construction.repository.SupplierRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SupplierServiceImpl implements SupplierService {

    private final SupplierRepository repo;

    public SupplierServiceImpl(SupplierRepository repo) {
        this.repo = repo;
    }

    @Override
    @Transactional
    public SupplierDtos.Response create(SupplierDtos.Request r) {
        if (r.email() != null && !r.email().isBlank() && repo.existsByEmail(r.email().trim())) {
            throw new DuplicateResourceException("Supplier with this email already exists: " + r.email());
        }

        Supplier s = Supplier.builder()
                .name(r.name().trim())
                .contactPerson(r.contactPerson() != null ? r.contactPerson().trim() : null)
                .phone(r.phone() != null ? r.phone().trim() : null)
                .email(r.email() != null ? r.email().trim() : null)
                .address(r.address() != null ? r.address().trim() : null)
                .status(r.status() != null && !r.status().isBlank() ? r.status().trim() : "ACTIVE")
                .build();

        return map(repo.save(s));
    }

    @Override
    public Page<SupplierDtos.Response> list(String search, Pageable p) {
        String s = (search != null && !search.isBlank()) ? search.trim() : null;
        Page<Supplier> page = (s != null) ? repo.searchSuppliers(s, p) : repo.findAll(p);
        return page.map(this::map);
    }

    @Override
    public SupplierDtos.Response get(Long id) {
        return map(entity(id));
    }

    @Override
    @Transactional
    public SupplierDtos.Response update(Long id, SupplierDtos.Request r) {
        Supplier s = entity(id);

        if (r.email() != null && !r.email().isBlank() && repo.existsByEmailAndIdNot(r.email().trim(), id)) {
            throw new DuplicateResourceException("Supplier with this email already exists: " + r.email());
        }

        s.setName(r.name().trim());
        s.setContactPerson(r.contactPerson() != null ? r.contactPerson().trim() : null);
        s.setPhone(r.phone() != null ? r.phone().trim() : null);
        s.setEmail(r.email() != null ? r.email().trim() : null);
        s.setAddress(r.address() != null ? r.address().trim() : null);
        if (r.status() != null && !r.status().isBlank()) {
            s.setStatus(r.status().trim());
        }

        return map(repo.save(s));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Supplier s = entity(id);
        repo.delete(s);
    }

    private Supplier entity(Long id) {
        return repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Supplier not found with ID: " + id));
    }

    private SupplierDtos.Response map(Supplier s) {
        return new SupplierDtos.Response(
                s.getId(),
                s.getName(),
                s.getContactPerson(),
                s.getPhone(),
                s.getEmail(),
                s.getAddress(),
                s.getStatus(),
                s.getCreatedAt(),
                s.getUpdatedAt()
        );
    }
}
