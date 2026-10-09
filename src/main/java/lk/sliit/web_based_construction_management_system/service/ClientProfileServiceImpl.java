package lk.sliit.web_based_construction_management_system.service;

import sliit.construction.construction.dto.ClientProfileDtos;
import sliit.construction.construction.entity.Role;
import sliit.construction.construction.entity.User;
import sliit.construction.construction.exception.DuplicateResourceException;
import sliit.construction.construction.exception.ResourceNotFoundException;
import sliit.construction.construction.repository.ClientProjectRequestRepository;
import sliit.construction.construction.repository.NotificationRepository;
import sliit.construction.construction.repository.UserRepository;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ClientProfileServiceImpl implements ClientProfileService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final ClientProjectRequestRepository clientProjectRequestRepository;
    private final NotificationRepository notificationRepository;


    public ClientProfileServiceImpl(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            ClientProjectRequestRepository clientProjectRequestRepository,
            NotificationRepository notificationRepository
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.clientProjectRequestRepository = clientProjectRequestRepository;
        this.notificationRepository = notificationRepository;
    }


    /*
     * ==========================================
     * READ MY PROFILE
     * ==========================================
     */
    @Override
    @Transactional(readOnly = true)
    public ClientProfileDtos.Response getMyProfile(
            String username
    ) {

        User user = getClient(username);

        return map(user);
    }


    /*
     * ==========================================
     * UPDATE MY PROFILE
     * ==========================================
     */
    @Override
    @Transactional
    public ClientProfileDtos.Response updateMyProfile(
            String currentUsername,
            ClientProfileDtos.UpdateRequest request
    ) {

        User user = getClient(currentUsername);


        /*
         * Check username duplication.
         */
        if (!user.getUsername().equalsIgnoreCase(request.username().trim())
                && userRepository.existsByUsername(
                request.username().trim()
        )) {

            throw new DuplicateResourceException(
                    "Username already exists."
            );
        }


        /*
         * Check email duplication.
         */
        if (!user.getEmail().equalsIgnoreCase(request.email().trim())
                && userRepository.existsByEmail(
                request.email().trim()
        )) {

            throw new DuplicateResourceException(
                    "Email already exists."
            );
        }


        /*
         * Update full name.
         */
        user.setFullName(
                request.fullName().trim()
        );


        /*
         * Update username.
         */
        user.setUsername(
                request.username().trim()
        );


        /*
         * Update email.
         */
        user.setEmail(
                request.email().trim()
        );


        /*
         * Update phone number.
         */
        user.setPhoneNumber(

                request.phoneNumber() == null
                        || request.phoneNumber().isBlank()

                        ? null

                        : request.phoneNumber().trim()
        );


        /*
         * Password is optional.
         *
         * Empty password means:
         * keep the existing password.
         */
        if (request.password() != null
                && !request.password().isBlank()) {

            user.setPasswordHash(
                    passwordEncoder.encode(
                            request.password().trim()
                    )
            );
        }

        /*
         * Update profile picture if provided
         */
        if (request.profilePicture() != null) {
            user.setProfilePicture(
                    request.profilePicture().isBlank() ? null : request.profilePicture().trim()
            );
        }


        /*
         * Client cannot change their role.
         */
        user.setRole(Role.CLIENT);


        return map(
                userRepository.save(user)
        );
    }


    /*
     * ==========================================
     * DELETE MY PROFILE
     * ==========================================
     */
    @Override
    @Transactional
    public void deleteMyProfile(
            String username
    ) {

        User user = getClient(username);

        // Remove linked client project requests
        clientProjectRequestRepository.deleteByClient(user);

        // Remove any linked notifications
        notificationRepository.deleteByRecipient(user);

        // Delete client user record
        userRepository.delete(user);
    }


    /*
     * ==========================================
     * FIND CLIENT
     * ==========================================
     */
    private User getClient(
            String identifier
    ) {

        User user =
                userRepository
                        .findByUsernameOrEmail(identifier, identifier)
                        .orElseThrow(
                                () -> new ResourceNotFoundException(
                                        "Client profile not found."
                                )
                        );


        /*
         * Make sure only CLIENT accounts
         * can use this service.
         */
        if (user.getRole() != Role.CLIENT) {

            throw new ResourceNotFoundException(
                    "Client profile not found."
            );
        }


        return user;
    }


    /*
     * ==========================================
     * ENTITY → RESPONSE DTO
     * ==========================================
     */
    private ClientProfileDtos.Response map(
            User user
    ) {

        return new ClientProfileDtos.Response(

                user.getId(),

                user.getUsername(),

                user.getEmail(),

                user.getRole(),

                user.getFullName(),

                user.getPhoneNumber(),

                user.getProfilePicture(),

                user.getCreatedAt(),

                user.getUpdatedAt()
        );
    }
}
