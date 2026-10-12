package sliit.construction.construction.service;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import sliit.construction.construction.dto.MaterialRequestDtos;
import sliit.construction.construction.dto.NotificationDtos;
import sliit.construction.construction.entity.*;
import sliit.construction.construction.exception.ResourceNotFoundException;
import sliit.construction.construction.repository.MaterialRepository;
import sliit.construction.construction.repository.MaterialRequestRepository;
import sliit.construction.construction.repository.SupplierRepository;
import sliit.construction.construction.repository.UserRepository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MaterialRequestServiceImpl
        implements MaterialRequestService {

    private final MaterialRequestRepository repository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final MaterialRepository materialRepository;
    private final SupplierRepository supplierRepository;

    @Override
    @Transactional
    public MaterialRequestDtos.Response create(
            MaterialRequestDtos.Request request) {

        if (repository.existsByRequestCode(request.requestCode())) {
            throw new IllegalArgumentException(
                    "Request code already exists."
            );
        }

        String cleanSupplier = request.supplierName() != null && !request.supplierName().isBlank()
                ? request.supplierName().trim()
                : null;

        MaterialRequest materialRequest = MaterialRequest.builder()
                .requestCode(request.requestCode())
                .materialName(request.materialName())
                .quantity(request.quantity())
                .unit(request.unit())
                .projectName(request.projectName())
                .requestedBy(request.requestedBy())
                .requiredDate(request.requiredDate())
                .reason(request.reason())
                .status(
                        request.status() != null
                                ? request.status()
                                : MaterialRequestStatus.PENDING
                )
                .supplierName(cleanSupplier)
                .build();

        MaterialRequest saved = repository.save(materialRequest);

        // Synchronize assigned supplier with Material & Inventory catalog in database
        syncWithMaterialInventory(saved.getMaterialName(), saved.getUnit(), cleanSupplier);

        // Dispatch notifications to suppliers and project management
        try {
            if (userRepository != null && notificationService != null) {
                userRepository.findByRole(Role.SUPPLIER).forEach(u -> {
                    notificationService.create(new NotificationDtos.Request(
                            "New Material Requisition: " + saved.getRequestCode(),
                            "Procurement created requisition " + saved.getRequestCode() + " for " + saved.getQuantity() + " " + saved.getUnit() + " of " + saved.getMaterialName() + " (" + saved.getProjectName() + "). Please review in Supplier Dashboard.",
                            "MATERIAL_REQUEST_NEW:" + saved.getId(),
                            u.getId()
                    ));
                });
            }
        } catch (Exception ignored) {
        }

        return mapToResponse(saved);
    }

    @Override
    public Page<MaterialRequestDtos.Response> list(
            String search,
            MaterialRequestStatus status,
            Pageable pageable) {

        String cleanSearch =
                search == null || search.isBlank()
                        ? null
                        : search.trim();

        return repository
                .searchRequests(cleanSearch, status, pageable)
                .map(this::mapToResponse);
    }

    @Override
    public MaterialRequestDtos.Response get(Long id) {

        MaterialRequest request = repository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Material request not found with id: " + id
                        )
                );

        return mapToResponse(request);
    }

    @Override
    @Transactional
    public MaterialRequestDtos.Response update(
            Long id,
            MaterialRequestDtos.Request request) {

        MaterialRequest existing = repository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Material request not found with id: " + id
                        )
                );

        if (repository.existsByRequestCodeAndIdNot(
                request.requestCode(), id)) {

            throw new IllegalArgumentException(
                    "Request code already exists."
            );
        }

        existing.setRequestCode(request.requestCode());
        existing.setMaterialName(request.materialName());
        existing.setQuantity(request.quantity());
        existing.setUnit(request.unit());
        existing.setProjectName(request.projectName());
        existing.setRequestedBy(request.requestedBy());
        existing.setRequiredDate(request.requiredDate());
        existing.setReason(request.reason());

        existing.setSupplierName(
                request.supplierName() != null && !request.supplierName().isBlank()
                        ? request.supplierName().trim()
                        : null
        );

        if (request.status() != null) {
            existing.setStatus(request.status());
        }

        MaterialRequest updated = repository.save(existing);

        // Synchronize assigned supplier with Material & Inventory catalog in database
        syncWithMaterialInventory(updated.getMaterialName(), updated.getUnit(), updated.getSupplierName());

        return mapToResponse(updated);
    }

    @Override
    @Transactional
    public MaterialRequestDtos.Response updateStatus(
            Long id,
            MaterialRequestDtos.StatusUpdateRequest request,
            String actorUsername) {

        MaterialRequest existing = repository.findById(id)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Material request not found with id: " + id
                        )
                );

        MaterialRequestStatus newStatus = request.status();
        existing.setStatus(newStatus);

        if (request.remarks() != null) {
            existing.setDecisionRemarks(request.remarks().trim());
        }

        if (request.supplierName() != null && !request.supplierName().isBlank()) {
            existing.setSupplierName(request.supplierName().trim());
        }

        existing.setDecisionDate(LocalDateTime.now());

        String decisionActor = actorUsername != null ? actorUsername : "Supplier";
        if (userRepository != null && actorUsername != null) {
            User user = userRepository.findByUsernameOrEmail(actorUsername, actorUsername).orElse(null);
            if (user != null) {
                decisionActor = (user.getFullName() != null && !user.getFullName().isBlank())
                        ? user.getFullName()
                        : user.getUsername();
                if (existing.getSupplierName() == null || existing.getSupplierName().isBlank()) {
                    existing.setSupplierName(decisionActor);
                }
            }
        }
        existing.setDecisionBy(decisionActor);

        MaterialRequest saved = repository.save(existing);

        // Synchronize assigned supplier with Material & Inventory catalog in database
        if (saved.getSupplierName() != null && !saved.getSupplierName().isBlank()) {
            syncWithMaterialInventory(saved.getMaterialName(), saved.getUnit(), saved.getSupplierName());
        }

        // Notify Procurement Officers and Project Managers
        try {
            if (userRepository != null && notificationService != null) {
                String actionLabel = (newStatus == MaterialRequestStatus.ACCEPTED || newStatus == MaterialRequestStatus.APPROVED)
                        ? "ACCEPTED"
                        : (newStatus == MaterialRequestStatus.DECLINED || newStatus == MaterialRequestStatus.REJECTED)
                                ? "DECLINED"
                                : "PENDING";
                String remarksNote = (request.remarks() != null && !request.remarks().isBlank())
                        ? " Remarks: " + request.remarks()
                        : "";
                String notifMsg = "Supplier " + decisionActor + " has marked material request " + saved.getRequestCode() + " for " + saved.getMaterialName() + " as " + actionLabel + "." + remarksNote;

                userRepository.findByRole(Role.PROCUREMENT_OFFICER).forEach(u -> {
                    notificationService.create(new NotificationDtos.Request(
                            "Material Request " + actionLabel + ": " + saved.getRequestCode(),
                            notifMsg,
                            "MATERIAL_REQUEST_STATUS:" + newStatus.name() + ":" + saved.getId(),
                            u.getId()
                    ));
                });

                userRepository.findByRole(Role.PROJECT_MANAGER).forEach(u -> {
                    notificationService.create(new NotificationDtos.Request(
                            "Material Request " + actionLabel + ": " + saved.getRequestCode(),
                            notifMsg,
                            "MATERIAL_REQUEST_STATUS:" + newStatus.name() + ":" + saved.getId(),
                            u.getId()
                    ));
                });
            }
        } catch (Exception ignored) {
        }

        return mapToResponse(saved);
    }

    @Override
    public void delete(Long id) {

        if (!repository.existsById(id)) {
            throw new ResourceNotFoundException(
                    "Material request not found with id: " + id
            );
        }

        repository.deleteById(id);
    }

    private void syncWithMaterialInventory(String materialName, String unit, String supplierName) {
        if (materialName == null || materialName.isBlank()) {
            return;
        }

        String cleanName = materialName.trim();
        String cleanSupplier = (supplierName != null && !supplierName.isBlank())
                ? supplierName.trim()
                : null;

        // Auto-provision or verify supplier in Supplier catalog if provided
        if (cleanSupplier != null && supplierRepository != null) {
            try {
                if (!supplierRepository.existsByName(cleanSupplier)) {
                    Supplier newSupplier = Supplier.builder()
                            .name(cleanSupplier)
                            .status("ACTIVE")
                            .build();
                    supplierRepository.save(newSupplier);
                }
            } catch (Exception ignored) {
            }
        }

        // Synchronize with materials catalog in SQL Server
        if (materialRepository != null) {
            try {
                List<Material> matchingMaterials = materialRepository.findByNameIgnoreCase(cleanName);
                if (!matchingMaterials.isEmpty()) {
                    for (Material mat : matchingMaterials) {
                        mat.setSupplier(cleanSupplier);
                        materialRepository.save(mat);
                    }
                } else if (cleanSupplier != null) {
                    // Auto-provision inventory item if not already in catalog so it immediately appears in Material & Inventory Dashboard
                    String cleanUnit = (unit != null && !unit.isBlank()) ? unit.trim() : "Units";
                    String generatedCode = "MAT-" + (System.currentTimeMillis() % 1000000);
                    Material newMaterial = Material.builder()
                            .code(generatedCode)
                            .name(cleanName)
                            .category("General")
                            .quantity(BigDecimal.ZERO)
                            .unit(cleanUnit)
                            .supplier(cleanSupplier)
                            .unitPrice(BigDecimal.ZERO)
                            .stockThreshold(BigDecimal.ZERO)
                            .deliveryStatus(DeliveryStatus.REQUESTED)
                            .build();
                    materialRepository.save(newMaterial);
                }
            } catch (Exception ignored) {
            }
        }
    }

    private MaterialRequestDtos.Response mapToResponse(
            MaterialRequest request) {

        return new MaterialRequestDtos.Response(
                request.getId(),
                request.getRequestCode(),
                request.getMaterialName(),
                request.getQuantity(),
                request.getUnit(),
                request.getProjectName(),
                request.getRequestedBy(),
                request.getRequiredDate(),
                request.getReason(),
                request.getStatus(),
                request.getSupplierName(),
                request.getDecisionRemarks(),
                request.getDecisionDate(),
                request.getDecisionBy(),
                request.getCreatedAt(),
                request.getUpdatedAt()
        );
    }
}