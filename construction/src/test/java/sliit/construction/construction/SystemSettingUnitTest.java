package sliit.construction.construction;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import sliit.construction.construction.dto.SystemSettingDtos;
import sliit.construction.construction.entity.SystemSetting;
import sliit.construction.construction.exception.DuplicateResourceException;
import sliit.construction.construction.exception.ResourceNotFoundException;
import sliit.construction.construction.repository.SystemSettingRepository;
import sliit.construction.construction.service.SystemSettingServiceImpl;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class SystemSettingUnitTest {

    private SystemSettingRepository settingRepo;
    private SystemSettingServiceImpl settingService;

    @BeforeEach
    void setUp() {
        settingRepo = mock(SystemSettingRepository.class);
        settingService = new SystemSettingServiceImpl(settingRepo);
    }

    @Test
    @DisplayName("Create Setting: Successfully creates a new system setting parameter")
    void testCreateSettingSuccess() {
        SystemSettingDtos.Request request = new SystemSettingDtos.Request(
                "COMPANY_NAME",
                "WBCMS Construction Partners Ltd.",
                "GENERAL",
                "Official enterprise contractor firm name",
                "STRING",
                "ACTIVE"
        );

        when(settingRepo.existsBySettingKeyIgnoreCase("COMPANY_NAME")).thenReturn(false);
        when(settingRepo.save(any(SystemSetting.class))).thenAnswer(invocation -> {
            SystemSetting entity = invocation.getArgument(0);
            entity.setId(1L);
            entity.setCreatedAt(LocalDateTime.now());
            entity.setUpdatedAt(LocalDateTime.now());
            return entity;
        });

        SystemSettingDtos.Response response = settingService.create(request);

        assertNotNull(response);
        assertEquals(1L, response.id());
        assertEquals("COMPANY_NAME", response.settingKey());
        assertEquals("WBCMS Construction Partners Ltd.", response.settingValue());
        assertEquals("GENERAL", response.category());
        assertEquals("STRING", response.dataType());
        assertEquals("ACTIVE", response.status());
        verify(settingRepo, times(1)).save(any(SystemSetting.class));
    }

    @Test
    @DisplayName("Create Setting: Throws DuplicateResourceException if setting key already exists")
    void testCreateSettingDuplicateError() {
        SystemSettingDtos.Request request = new SystemSettingDtos.Request(
                "COMPANY_NAME",
                "Duplicate Value",
                "GENERAL",
                "Description",
                "STRING",
                "ACTIVE"
        );

        when(settingRepo.existsBySettingKeyIgnoreCase("COMPANY_NAME")).thenReturn(true);

        assertThrows(DuplicateResourceException.class, () -> settingService.create(request));
        verify(settingRepo, never()).save(any(SystemSetting.class));
    }

    @Test
    @DisplayName("Read Settings: Successfully lists paginated and filtered settings")
    void testListSettings() {
        SystemSetting s1 = SystemSetting.builder()
                .id(1L)
                .settingKey("STOCK_SAFETY_THRESHOLD")
                .settingValue("25")
                .category("INVENTORY")
                .dataType("NUMBER")
                .status("ACTIVE")
                .description("Minimum stock line")
                .build();

        Pageable pageable = PageRequest.of(0, 10);
        Page<SystemSetting> page = new PageImpl<>(List.of(s1), pageable, 1);

        when(settingRepo.searchSettings(eq("threshold"), eq("INVENTORY"), eq(pageable)))
                .thenReturn(page);

        Page<SystemSettingDtos.Response> result = settingService.list("threshold", "INVENTORY", pageable);

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        SystemSettingDtos.Response first = result.getContent().get(0);
        assertEquals("STOCK_SAFETY_THRESHOLD", first.settingKey());
        assertEquals("25", first.settingValue());
        assertEquals("INVENTORY", first.category());
    }

    @Test
    @DisplayName("Read Single Setting: Returns setting by ID and throws 404 when not found")
    void testGetSettingById() {
        SystemSetting s1 = SystemSetting.builder()
                .id(5L)
                .settingKey("SESSION_TIMEOUT_MINUTES")
                .settingValue("60")
                .category("SECURITY")
                .dataType("NUMBER")
                .status("ACTIVE")
                .build();

        when(settingRepo.findById(5L)).thenReturn(Optional.of(s1));
        when(settingRepo.findById(999L)).thenReturn(Optional.empty());

        SystemSettingDtos.Response found = settingService.get(5L);
        assertNotNull(found);
        assertEquals("SESSION_TIMEOUT_MINUTES", found.settingKey());
        assertEquals("60", found.settingValue());

        assertThrows(ResourceNotFoundException.class, () -> settingService.get(999L));
    }

    @Test
    @DisplayName("Read Single Setting by Key: Returns setting by key and throws 404 when not found")
    void testGetSettingByKey() {
        SystemSetting s1 = SystemSetting.builder()
                .id(2L)
                .settingKey("DEFAULT_CURRENCY")
                .settingValue("USD")
                .category("GENERAL")
                .dataType("STRING")
                .status("ACTIVE")
                .build();

        when(settingRepo.findBySettingKeyIgnoreCase("DEFAULT_CURRENCY")).thenReturn(Optional.of(s1));
        when(settingRepo.findBySettingKeyIgnoreCase("NON_EXISTING")).thenReturn(Optional.empty());

        SystemSettingDtos.Response found = settingService.getByKey("DEFAULT_CURRENCY");
        assertNotNull(found);
        assertEquals("USD", found.settingValue());

        assertThrows(ResourceNotFoundException.class, () -> settingService.getByKey("NON_EXISTING"));
    }

    @Test
    @DisplayName("Update Setting: Successfully updates parameter value, category, and description")
    void testUpdateSettingSuccess() {
        SystemSetting existing = SystemSetting.builder()
                .id(10L)
                .settingKey("STOCK_SAFETY_THRESHOLD")
                .settingValue("25")
                .category("INVENTORY")
                .dataType("NUMBER")
                .status("ACTIVE")
                .description("Old threshold")
                .build();

        when(settingRepo.findById(10L)).thenReturn(Optional.of(existing));
        when(settingRepo.existsBySettingKeyIgnoreCaseAndIdNot("STOCK_SAFETY_THRESHOLD", 10L)).thenReturn(false);
        when(settingRepo.save(any(SystemSetting.class))).thenAnswer(invocation -> invocation.getArgument(0));

        SystemSettingDtos.Request updateRequest = new SystemSettingDtos.Request(
                "STOCK_SAFETY_THRESHOLD",
                "50",
                "INVENTORY",
                "Updated safety threshold for critical supplies",
                "NUMBER",
                "ACTIVE"
        );

        SystemSettingDtos.Response updated = settingService.update(10L, updateRequest);

        assertNotNull(updated);
        assertEquals("50", updated.settingValue());
        assertEquals("Updated safety threshold for critical supplies", updated.description());
        verify(settingRepo, times(1)).save(any(SystemSetting.class));
    }

    @Test
    @DisplayName("Update Setting: Throws DuplicateResourceException if renamed key matches another setting")
    void testUpdateSettingDuplicateKeyError() {
        SystemSetting existing = SystemSetting.builder()
                .id(10L)
                .settingKey("OLD_KEY")
                .settingValue("value")
                .category("GENERAL")
                .build();

        when(settingRepo.findById(10L)).thenReturn(Optional.of(existing));
        when(settingRepo.existsBySettingKeyIgnoreCaseAndIdNot("CONFLICT_KEY", 10L)).thenReturn(true);

        SystemSettingDtos.Request updateRequest = new SystemSettingDtos.Request(
                "CONFLICT_KEY",
                "value",
                "GENERAL",
                "desc",
                "STRING",
                "ACTIVE"
        );

        assertThrows(DuplicateResourceException.class, () -> settingService.update(10L, updateRequest));
        verify(settingRepo, never()).save(any(SystemSetting.class));
    }

    @Test
    @DisplayName("Delete Setting: Successfully deletes setting by ID")
    void testDeleteSettingSuccess() {
        SystemSetting setting = SystemSetting.builder()
                .id(20L)
                .settingKey("OBSOLETE_SETTING")
                .settingValue("old")
                .category("SYSTEM")
                .build();

        when(settingRepo.findById(20L)).thenReturn(Optional.of(setting));

        settingService.delete(20L);

        verify(settingRepo, times(1)).delete(setting);
    }

    @Test
    @DisplayName("Delete Setting: Throws ResourceNotFoundException when setting ID does not exist")
    void testDeleteSettingNotFound() {
        when(settingRepo.findById(999L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> settingService.delete(999L));
        verify(settingRepo, never()).delete(any(SystemSetting.class));
    }

    @Test
    @DisplayName("Stats: Accurately calculates totals, active count, and category distributions")
    void testGetSettingStats() {
        when(settingRepo.count()).thenReturn(12L);
        when(settingRepo.countByStatusIgnoreCase("ACTIVE")).thenReturn(10L);
        when(settingRepo.countByCategoryIgnoreCase("GENERAL")).thenReturn(4L);
        when(settingRepo.countByCategoryIgnoreCase("INVENTORY")).thenReturn(3L);
        when(settingRepo.countByCategoryIgnoreCase("SECURITY")).thenReturn(3L);
        when(settingRepo.countByCategoryIgnoreCase("SYSTEM")).thenReturn(2L);

        Map<String, Object> stats = settingService.getSettingStats();

        assertNotNull(stats);
        assertEquals(12L, stats.get("totalSettings"));
        assertEquals(10L, stats.get("activeSettings"));
        assertEquals(2L, stats.get("inactiveSettings"));
        assertEquals(4L, stats.get("generalSettings"));
        assertEquals(3L, stats.get("inventorySettings"));
        assertEquals(3L, stats.get("securitySettings"));
        assertEquals(2L, stats.get("systemSettings"));
    }
}
