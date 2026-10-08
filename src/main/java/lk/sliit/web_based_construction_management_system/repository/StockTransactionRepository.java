package lk.sliit.web_based_construction_management_system.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import sliit.construction.construction.entity.StockTransaction;

import java.util.List;

public interface StockTransactionRepository extends JpaRepository<StockTransaction, Long> {

    List<StockTransaction> findByMaterialIdOrderByCreatedAtDesc(Long materialId);

    Page<StockTransaction> findByMaterialId(Long materialId, Pageable pageable);
}
