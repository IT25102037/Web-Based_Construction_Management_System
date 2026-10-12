package sliit.construction.construction.service;

import sliit.construction.construction.dto.ClientProjectRequestDtos;

import java.util.List;

public interface ClientProjectRequestService {


    ClientProjectRequestDtos.Response create(
            String username,
            ClientProjectRequestDtos.Request request
    );


    List<ClientProjectRequestDtos.Response> getMyRequests(
            String username
    );


    ClientProjectRequestDtos.Response getMyRequest(
            String username,
            Long id
    );


    ClientProjectRequestDtos.Response update(
            String username,
            Long id,
            ClientProjectRequestDtos.Request request
    );


    void delete(
            String username,
            Long id
    );


    /*
     * ==========================================
     * STAFF / PROJECT MANAGER OPERATIONS
     * ==========================================
     */
    List<ClientProjectRequestDtos.Response> getAllRequests(
            sliit.construction.construction.entity.ProjectRequestStatus status
    );


    ClientProjectRequestDtos.Response getRequestById(
            Long id
    );


    ClientProjectRequestDtos.Response updateStatus(
            Long id,
            ClientProjectRequestDtos.StatusUpdateRequest updateRequest,
            String staffUsername
    );


    sliit.construction.construction.dto.ProjectDtos.Response convertToProject(
            Long id,
            String staffUsername
    );
}
