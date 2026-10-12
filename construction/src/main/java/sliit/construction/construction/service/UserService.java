package sliit.construction.construction.service;

import sliit.construction.construction.dto.UserDtos;
import sliit.construction.construction.entity.User;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface UserService {

 UserDtos.Response create(
         UserDtos.Request request
 );


 Page<UserDtos.Response> list(
         String search,
         Pageable pageable
 );

 Page<UserDtos.Response> list(
         String search,
         String role,
         Pageable pageable
 );

 java.util.Map<String, Object> getUserStats();


 Page<UserDtos.Response> getProjectManagers(
         Pageable pageable
 );


 UserDtos.Response get(
         Long id
 );


 UserDtos.Response update(
         Long id,
         UserDtos.Request request
 );


 void delete(
         Long id
 );


 User getEntity(
         Long id
 );


 User getByUsername(
         String username
 );

 User getByUsernameOrEmail(
         String identifier
 );

 void changePassword(
         String username,
         String currentPassword,
         String newPassword,
         String confirmNewPassword
 );

 UserDtos.Response getProfile(
         String username
 );

 UserDtos.Response updateProfile(
         String currentUsername,
         UserDtos.ProfileUpdateRequest request
 );

 void deleteProfile(
         String currentUsername
 );
}