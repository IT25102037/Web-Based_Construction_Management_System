package sliit.construction.construction.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import sliit.construction.construction.entity.SystemSetting;

import java.util.List;
import java.util.Optional;

@Repository
public interface SystemSettingRepository extends JpaRepository<SystemSetting, Long> {

    Optional<SystemSetting> findBySettingKeyIgnoreCase(String settingKey);

    boolean existsBySettingKeyIgnoreCase(String settingKey);

    boolean existsBySettingKeyIgnoreCaseAndIdNot(String settingKey, Long id);

    List<SystemSetting> findByCategoryIgnoreCase(String category);

    List<SystemSetting> findAllByOrderByCategoryAscSettingKeyAsc();

    @Query("SELECT s FROM SystemSetting s WHERE " +
           "(:search IS NULL OR " +
           " LOWER(s.settingKey) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(s.settingValue) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(s.description) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           " LOWER(s.category) LIKE LOWER(CONCAT('%', :search, '%'))) AND " +
           "(:category IS NULL OR LOWER(s.category) = LOWER(:category))")
    Page<SystemSetting> searchSettings(@Param("search") String search,
                                      @Param("category") String category,
                                      Pageable pageable);

    long countByCategoryIgnoreCase(String category);

    long countByStatusIgnoreCase(String status);
}
