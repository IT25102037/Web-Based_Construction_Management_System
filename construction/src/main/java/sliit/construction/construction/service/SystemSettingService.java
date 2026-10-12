package sliit.construction.construction.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import sliit.construction.construction.dto.SystemSettingDtos;

import java.util.List;
import java.util.Map;

public interface SystemSettingService {

    SystemSettingDtos.Response create(SystemSettingDtos.Request request);

    Page<SystemSettingDtos.Response> list(String search, String category, Pageable pageable);

    List<SystemSettingDtos.Response> getAllSettings();

    SystemSettingDtos.Response get(Long id);

    SystemSettingDtos.Response getByKey(String settingKey);

    SystemSettingDtos.Response update(Long id, SystemSettingDtos.Request request);

    void delete(Long id);

    Map<String, Object> getSettingStats();
}
