package sliit.construction.construction.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import sliit.construction.construction.entity.RoleEntity;

import java.util.List;
import java.util.Optional;

public interface RoleRepository extends JpaRepository<RoleEntity, Long> {

    Optional<RoleEntity> findByRoleCode(String roleCode);

    Optional<RoleEntity> findByRoleCodeIgnoreCase(String roleCode);

    boolean existsByRoleCode(String roleCode);

    boolean existsByRoleCodeIgnoreCase(String roleCode);

    Page<RoleEntity> findByRoleNameContainingIgnoreCaseOrRoleCodeContainingIgnoreCaseOrDescriptionContainingIgnoreCase(
            String roleName,
            String roleCode,
            String description,
            Pageable pageable
    );

    Page<RoleEntity> findByCategoryIgnoreCase(String category, Pageable pageable);

    List<RoleEntity> findAllByOrderByRoleNameAsc();
}
