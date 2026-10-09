package lk.sliit.web_based_construction_management_system.service;

import sliit.construction.construction.dto.MilestoneDtos;
import sliit.construction.construction.entity.MilestoneStatus;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface MilestoneService {

    MilestoneDtos.Response create(MilestoneDtos.Request request);

    Page<MilestoneDtos.Response> list(
            Long projectId,
            MilestoneStatus status,
            Pageable pageable
    );

    MilestoneDtos.Response get(Long id);

    MilestoneDtos.Response update(
            Long id,
            MilestoneDtos.Request request
    );

    void delete(Long id);
}
