package sliit.construction.construction.service;
import sliit.construction.construction.dto.ProgressDtos;
import org.springframework.data.domain.*;
public interface ProgressReportService {
 ProgressDtos.Response create(ProgressDtos.Request r); Page<ProgressDtos.Response> list(Long projectId,Pageable p);
 ProgressDtos.Response get(Long id); ProgressDtos.Response update(Long id,ProgressDtos.Request r); void delete(Long id);
}
