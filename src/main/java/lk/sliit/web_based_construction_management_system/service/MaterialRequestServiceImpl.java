package lk.sliit.web_based_construction_management_system.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import sliit.construction.construction.dto.MaterialRequestDtos;
import sliit.construction.construction.entity.MaterialRequest;
import sliit.construction.construction.entity.MaterialRequestStatus;
import sliit.construction.construction.exception.ResourceNotFoundException;
import sliit.construction.construction.repository.MaterialRequestRepository;

@Service
@RequiredArgsConstructor
public class MaterialRequestServiceImpl
        implements MaterialRequestService {

    private final MaterialRequestRepository repository;

    @Override
    public MaterialRequestDtos.Response create(
            MaterialRequestDtos.Request request) {

        if (repository.existsByRequestCode(request.requestCode())) {
            throw new IllegalArgumentException(
                    "Request code already exists."
            );
        }

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
                .build();

        MaterialRequest saved = repository.save(materialRequest);

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

        if (request.status() != null) {
            existing.setStatus(request.status());
        }

        MaterialRequest updated = repository.save(existing);

        return mapToResponse(updated);
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
                request.getCreatedAt(),
                request.getUpdatedAt()
        );
    }
}