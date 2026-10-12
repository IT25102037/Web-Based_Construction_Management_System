package sliit.construction.construction.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import sliit.construction.construction.dto.RoleDtos;
import sliit.construction.construction.entity.RoleEntity;

import java.util.List;
import java.util.Map;

public interface RoleService {

    RoleDtos.Response create(RoleDtos.Request request);

    Page<RoleDtos.Response> list(String search, String category, Pageable pageable);

    List<RoleDtos.Response> getAllRoles();

    RoleDtos.Response get(Long id);

    RoleDtos.Response getByCode(String roleCode);

    RoleDtos.Response update(Long id, RoleDtos.Request request);

    void delete(Long id);

    RoleEntity getEntity(Long id);

    List<RoleDtos.PermissionGroupDto> getAvailablePermissions();

    Map<String, Object> getRoleStats();
}
