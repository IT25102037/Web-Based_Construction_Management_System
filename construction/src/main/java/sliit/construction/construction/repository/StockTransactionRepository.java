package sliit.construction.construction.repository;

import sliit.construction.construction.entity.StockTransaction;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface StockTransactionRepository extends JpaRepository<StockTransaction, Long> {

    List<StockTransaction> findByMaterialIdOrderByCreatedAtDesc(Long materialId);

    Page<StockTransaction> findByMaterialId(Long materialId, Pageable pageable);
}
