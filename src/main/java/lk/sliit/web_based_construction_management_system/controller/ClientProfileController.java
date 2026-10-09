package lk.sliit.web_based_construction_management_system.controller;

import sliit.construction.construction.config.JwtService;
import sliit.construction.construction.dto.ClientProfileDtos;
import sliit.construction.construction.service.ClientProfileService;

import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/client/profile")
@PreAuthorize("hasRole('CLIENT')")
public class ClientProfileController {

    private final ClientProfileService clientProfileService;
    private final JwtService jwtService;


    public ClientProfileController(
            ClientProfileService clientProfileService,
            JwtService jwtService
    ) {
        this.clientProfileService = clientProfileService;
        this.jwtService = jwtService;
    }


    /*
     * ==========================================
     * READ MY PROFILE
     *
     * GET /api/client/profile
     * ==========================================
     */
    @GetMapping
    public ClientProfileDtos.Response getMyProfile(
            Authentication authentication
    ) {

        return clientProfileService.getMyProfile(
                authentication.getName()
        );
    }


    /*
     * ==========================================
     * UPDATE MY PROFILE
     *
     * PUT /api/client/profile
     *
     * A new JWT is generated because the
     * username may have changed.
     * ==========================================
     */
    @PutMapping
    public ClientProfileDtos.UpdateResponse updateMyProfile(
            Authentication authentication,
            @Valid @RequestBody ClientProfileDtos.UpdateRequest request
    ) {

        ClientProfileDtos.Response updatedProfile =
                clientProfileService.updateMyProfile(
                        authentication.getName(),
                        request
                );


        /*
         * Generate a fresh JWT using the
         * updated username.
         */
        String newToken =
                jwtService.generate(
                        updatedProfile.username(),
                        updatedProfile.role().name()
                );


        return new ClientProfileDtos.UpdateResponse(
                updatedProfile,
                newToken
        );
    }


    /*
     * ==========================================
     * DELETE MY PROFILE
     *
     * DELETE /api/client/profile
     * ==========================================
     */
    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMyProfile(
            Authentication authentication
    ) {

        clientProfileService.deleteMyProfile(
                authentication.getName()
        );
    }
}
