package sliit.construction.construction.service;

import sliit.construction.construction.dto.ClientProfileDtos;

public interface ClientProfileService {

    ClientProfileDtos.Response getMyProfile(String username);

    ClientProfileDtos.Response updateMyProfile(
            String currentUsername,
            ClientProfileDtos.UpdateRequest request
    );

    void deleteMyProfile(String username);
}

