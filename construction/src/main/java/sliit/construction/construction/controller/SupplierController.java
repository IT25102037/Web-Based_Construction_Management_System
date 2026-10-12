package sliit.construction.construction.controller;

import sliit.construction.construction.dto.SupplierDtos;
import sliit.construction.construction.service.SupplierService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/suppliers")
public class SupplierController {

    private final SupplierService s;

    public SupplierController(SupplierService s) {
        this.s = s;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('PROCUREMENT_OFFICER', 'PROJECT_MANAGER', 'SYSTEM_ADMINISTRATOR')")
    public SupplierDtos.Response create(@Valid @RequestBody SupplierDtos.Request r) {
        return s.create(r);
    }

    @GetMapping
    public Page<SupplierDtos.Response> list(
            @RequestParam(required = false) String search,
            Pageable p) {
        return s.list(search, p);
    }

    @GetMapping("/{id}")
    public SupplierDtos.Response get(@PathVariable Long id) {
        return s.get(id);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('PROCUREMENT_OFFICER', 'PROJECT_MANAGER', 'SYSTEM_ADMINISTRATOR')")
    public SupplierDtos.Response update(@PathVariable Long id, @Valid @RequestBody SupplierDtos.Request r) {
        return s.update(id, r);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('PROCUREMENT_OFFICER', 'PROJECT_MANAGER', 'SYSTEM_ADMINISTRATOR')")
    public void delete(@PathVariable Long id) {
        s.delete(id);
    }
}
