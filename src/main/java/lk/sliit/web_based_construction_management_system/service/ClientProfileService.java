package lk.sliit.web_based_construction_management_system.service;

import sliit.construction.construction.dto.ClientProfileDtos;

public interface ClientProfileService {

    ClientProfileDtos.Response getMyProfile(String username);

    ClientProfileDtos.Response updateMyProfile(
            String currentUsername,
            ClientProfileDtos.UpdateRequest request
    );

    void deleteMyProfile(String username);
}
