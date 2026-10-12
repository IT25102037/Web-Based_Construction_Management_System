package sliit.construction.construction.repository;

import sliit.construction.construction.entity.Role;
import sliit.construction.construction.entity.User;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserRepository
        extends JpaRepository<User, Long> {


    // =========================================================
    // USERNAME
    // =========================================================

    boolean existsByUsername(
            String username
    );


    Optional<User> findByUsername(
            String username
    );

    Optional<User> findByEmail(
            String email
    );

    Optional<User> findByUsernameOrEmail(
            String username,
            String email
    );


    // =========================================================
    // EMAIL
    // =========================================================

    boolean existsByEmail(
            String email
    );


    // =========================================================
    // SEARCH USERS
    // =========================================================

    Page<User>
    findByUsernameContainingIgnoreCaseOrFullNameContainingIgnoreCase(
            String username,
            String fullName,
            Pageable pageable
    );

    Page<User>
    findByUsernameContainingIgnoreCaseOrFullNameContainingIgnoreCaseOrEmailContainingIgnoreCase(
            String username,
            String fullName,
            String email,
            Pageable pageable
    );

    Page<User>
    findByRoleAndUsernameContainingIgnoreCaseOrRoleAndFullNameContainingIgnoreCase(
            Role role1,
            String username,
            Role role2,
            String fullName,
            Pageable pageable
    );


    // =========================================================
    // FIND USERS BY ROLE
    // =========================================================

    Page<User> findByRole(
            Role role,
            Pageable pageable
    );

    java.util.List<User> findByRole(
            Role role
    );

    long countByRole(
            Role role
    );
}