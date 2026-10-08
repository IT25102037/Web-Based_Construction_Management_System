package lk.sliit.web_based_construction_management_system.controller;

import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import sliit.construction.construction.dto.MaterialDtos;
import sliit.construction.construction.entity.DeliveryStatus;
import sliit.construction.construction.service.MaterialService;

import java.util.List;

@RestController
@RequestMapping("/api/materials")
public class MaterialController {

    private final MaterialService s;

    public MaterialController(MaterialService s) {
        this.s = s;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('PROCUREMENT_OFFICER', 'PROJECT_MANAGER', 'SITE_ENGINEER', 'SYSTEM_ADMINISTRATOR')")
    public MaterialDtos.Response create(@Valid @RequestBody MaterialDtos.Request r) {
        return s.create(r);
    }

    @GetMapping
    public Page<MaterialDtos.Response> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) DeliveryStatus deliveryStatus,
            Pageable p) {
        return s.list(search, category, status, deliveryStatus, p);
    }

    @GetMapping("/{id}")
    public MaterialDtos.Response get(@PathVariable Long id) {
        return s.get(id);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('PROCUREMENT_OFFICER', 'PROJECT_MANAGER', 'SITE_ENGINEER', 'SYSTEM_ADMINISTRATOR')")
    public MaterialDtos.Response update(@PathVariable Long id, @Valid @RequestBody MaterialDtos.Request r) {
        return s.update(id, r);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAnyRole('PROCUREMENT_OFFICER', 'PROJECT_MANAGER', 'SYSTEM_ADMINISTRATOR')")
    public void delete(@PathVariable Long id) {
        s.delete(id);
    }

    @PostMapping("/{id}/receive")
    @PreAuthorize("hasAnyRole('PROCUREMENT_OFFICER', 'PROJECT_MANAGER', 'SITE_ENGINEER', 'CONSTRUCTION_SUPERVISOR', 'SYSTEM_ADMINISTRATOR')")
    public MaterialDtos.Response receiveStock(
            @PathVariable Long id,
            @Valid @RequestBody MaterialDtos.StockTransactionRequest r,
            Authentication auth) {
        String username = auth != null ? auth.getName() : "Staff";
        return s.receiveStock(id, r, username);
    }

    @PostMapping("/{id}/issue")
    @PreAuthorize("hasAnyRole('PROCUREMENT_OFFICER', 'PROJECT_MANAGER', 'SITE_ENGINEER', 'CONSTRUCTION_SUPERVISOR', 'SYSTEM_ADMINISTRATOR')")
    public MaterialDtos.Response issueStock(
            @PathVariable Long id,
            @Valid @RequestBody MaterialDtos.StockTransactionRequest r,
            Authentication auth) {
        String username = auth != null ? auth.getName() : "Staff";
        return s.issueStock(id, r, username);
    }

    @PostMapping("/{id}/adjust")
    @PreAuthorize("hasAnyRole('PROCUREMENT_OFFICER', 'PROJECT_MANAGER', 'SYSTEM_ADMINISTRATOR')")
    public MaterialDtos.Response adjustStock(
            @PathVariable Long id,
            @Valid @RequestBody MaterialDtos.StockAdjustmentRequest r,
            Authentication auth) {
        String username = auth != null ? auth.getName() : "Staff";
        return s.adjustStock(id, r, username);
    }

    @GetMapping("/{id}/transactions")
    public List<MaterialDtos.TransactionResponse> getTransactions(@PathVariable Long id) {
        return s.getTransactions(id);
    }
}
