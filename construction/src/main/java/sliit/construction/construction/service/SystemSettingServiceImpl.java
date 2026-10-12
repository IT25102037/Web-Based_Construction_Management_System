package sliit.construction.construction.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sliit.construction.construction.dto.SystemSettingDtos;
import sliit.construction.construction.entity.SystemSetting;
import sliit.construction.construction.exception.DuplicateResourceException;
import sliit.construction.construction.exception.ResourceNotFoundException;
import sliit.construction.construction.repository.SystemSettingRepository;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class SystemSettingServiceImpl implements SystemSettingService {

    private final SystemSettingRepository settingRepository;

    public SystemSettingServiceImpl(SystemSettingRepository settingRepository) {
        this.settingRepository = settingRepository;
    }

    @Override
    @Transactional
    public SystemSettingDtos.Response create(SystemSettingDtos.Request request) {
        String cleanKey = request.settingKey().trim();

        if (settingRepository.existsBySettingKeyIgnoreCase(cleanKey)) {
            throw new DuplicateResourceException("System setting with key '" + cleanKey + "' already exists.");
        }

        SystemSetting setting = SystemSetting.builder()
                .settingKey(cleanKey)
                .settingValue(request.settingValue().trim())
                .category(request.category() != null ? request.category().trim().toUpperCase() : "GENERAL")
                .description(request.description() != null ? request.description().trim() : null)
                .dataType(request.dataType() != null && !request.dataType().isBlank() ? request.dataType().trim().toUpperCase() : "STRING")
                .status(request.status() != null && !request.status().isBlank() ? request.status().trim().toUpperCase() : "ACTIVE")
                .build();

        return mapToResponse(settingRepository.save(setting));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<SystemSettingDtos.Response> list(String search, String category, Pageable pageable) {
        String cleanSearch = (search != null && !search.isBlank()) ? search.trim() : null;
        String cleanCategory = (category != null && !category.isBlank() && !category.equalsIgnoreCase("ALL"))
                ? category.trim()
                : null;

        Page<SystemSetting> page = settingRepository.searchSettings(cleanSearch, cleanCategory, pageable);
        return page.map(this::mapToResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SystemSettingDtos.Response> getAllSettings() {
        return settingRepository.findAllByOrderByCategoryAscSettingKeyAsc()
                .stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public SystemSettingDtos.Response get(Long id) {
        return mapToResponse(findEntityById(id));
    }

    @Override
    @Transactional(readOnly = true)
    public SystemSettingDtos.Response getByKey(String settingKey) {
        SystemSetting setting = settingRepository.findBySettingKeyIgnoreCase(settingKey.trim())
                .orElseThrow(() -> new ResourceNotFoundException("System setting not found with key: " + settingKey));
        return mapToResponse(setting);
    }

    @Override
    @Transactional
    public SystemSettingDtos.Response update(Long id, SystemSettingDtos.Request request) {
        SystemSetting setting = findEntityById(id);
        String cleanKey = request.settingKey().trim();

        if (settingRepository.existsBySettingKeyIgnoreCaseAndIdNot(cleanKey, id)) {
            throw new DuplicateResourceException("Another system setting already exists with key: '" + cleanKey + "'");
        }

        setting.setSettingKey(cleanKey);
        setting.setSettingValue(request.settingValue().trim());
        if (request.category() != null && !request.category().isBlank()) {
            setting.setCategory(request.category().trim().toUpperCase());
        }
        setting.setDescription(request.description() != null ? request.description().trim() : null);
        if (request.dataType() != null && !request.dataType().isBlank()) {
            setting.setDataType(request.dataType().trim().toUpperCase());
        }
        if (request.status() != null && !request.status().isBlank()) {
            setting.setStatus(request.status().trim().toUpperCase());
        }

        return mapToResponse(settingRepository.save(setting));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        SystemSetting setting = findEntityById(id);
        settingRepository.delete(setting);
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> getSettingStats() {
        Map<String, Object> stats = new LinkedHashMap<>();
        long total = settingRepository.count();
        long active = settingRepository.countByStatusIgnoreCase("ACTIVE");
        long inactive = total - active;
        long generalCount = settingRepository.countByCategoryIgnoreCase("GENERAL");
        long inventoryCount = settingRepository.countByCategoryIgnoreCase("INVENTORY");
        long securityCount = settingRepository.countByCategoryIgnoreCase("SECURITY");
        long systemCount = settingRepository.countByCategoryIgnoreCase("SYSTEM");

        stats.put("totalSettings", total);
        stats.put("activeSettings", active);
        stats.put("inactiveSettings", inactive);
        stats.put("generalSettings", generalCount);
        stats.put("inventorySettings", inventoryCount);
        stats.put("securitySettings", securityCount);
        stats.put("systemSettings", systemCount);
        return stats;
    }

    private SystemSetting findEntityById(Long id) {
        return settingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("System setting not found with ID: " + id));
    }

    private SystemSettingDtos.Response mapToResponse(SystemSetting s) {
        return new SystemSettingDtos.Response(
                s.getId(),
                s.getSettingKey(),
                s.getSettingValue(),
                s.getCategory(),
                s.getDescription(),
                s.getDataType(),
                s.getStatus(),
                s.getCreatedAt(),
                s.getUpdatedAt()
        );
    }
}
