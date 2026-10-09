package lk.sliit.web_based_construction_management_system.repository;

import sliit.construction.construction.entity.ClientProjectRequest;
import sliit.construction.construction.entity.User;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ClientProjectRequestRepository
        extends JpaRepository<ClientProjectRequest, Long> {


    /*
     * Get only requests belonging to
     * the logged-in client.
     */
    List<ClientProjectRequest>
    findByClient_UsernameOrderByCreatedAtDesc(
            String username
    );

    List<ClientProjectRequest>
    findByClient_IdOrderByCreatedAtDesc(
            Long clientId
    );


    /*
     * Find a specific request only if
     * it belongs to the logged-in client.
     */
    Optional<ClientProjectRequest>
    findByIdAndClient_Username(
            Long id,
            String username
    );

    /*
     * Delete all requests submitted by the client upon profile deletion.
     */
    void deleteByClient(User client);

    /*
     * Staff & Project Manager queries.
     */
    List<ClientProjectRequest> findAllByOrderByCreatedAtDesc();

    List<ClientProjectRequest> findByStatusOrderByCreatedAtDesc(sliit.construction.construction.entity.ProjectRequestStatus status);

    long countByStatus(sliit.construction.construction.entity.ProjectRequestStatus status);
}

