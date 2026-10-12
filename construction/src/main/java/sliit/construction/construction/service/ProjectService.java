package sliit.construction.construction.service;

import sliit.construction.construction.dto.ProjectDtos;
import sliit.construction.construction.entity.ProjectStatus;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface ProjectService {

 ProjectDtos.Response create(
         ProjectDtos.Request r
 );


 Page<ProjectDtos.Response> list(
         String search,
         Pageable p
 );


 Page<ProjectDtos.Response> listByStatus(
         ProjectStatus status,
         Pageable p
 );


 Page<ProjectDtos.Response> listByManager(
         Long id,
         Pageable p
 );


 ProjectDtos.Response get(
         Long id
 );


 ProjectDtos.Response update(
         Long id,
         ProjectDtos.Request r
 );


 void delete(
         Long id
 );
}
