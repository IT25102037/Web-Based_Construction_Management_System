package sliit.construction.construction.service;

import sliit.construction.construction.dto.MaterialDtos;
import sliit.construction.construction.entity.DeliveryStatus;
import sliit.construction.construction.entity.Material;
import sliit.construction.construction.entity.StockTransaction;
import sliit.construction.construction.exception.DuplicateResourceException;
import sliit.construction.construction.exception.ResourceNotFoundException;
import sliit.construction.construction.repository.MaterialRepository;
import sliit.construction.construction.repository.StockTransactionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class MaterialServiceImpl implements MaterialService {

    private final MaterialRepository repo;
    private final StockTransactionRepository txRepo;

    public MaterialServiceImpl(MaterialRepository repo, StockTransactionRepository txRepo) {
        this.repo = repo;
        this.txRepo = txRepo;
    }

    @Override
    @Transactional
    public MaterialDtos.Response create(MaterialDtos.Request r) {
        if (r.code() != null && !r.code().isBlank() && repo.existsByCode(r.code().trim())) {
            throw new DuplicateResourceException("Material code already exists: " + r.code());
        }

        Material m = new Material();
        build(m, r);

        Material saved = repo.save(m);

        if (saved.getQuantity() != null && saved.getQuantity().compareTo(BigDecimal.ZERO) > 0) {
            StockTransaction tx = StockTransaction.builder()
                    .material(saved)
                    .transactionType("RECEIVE")
                    .quantity(saved.getQuantity())
                    .previousQuantity(BigDecimal.ZERO)
                    .newQuantity(saved.getQuantity())
                    .referenceNotes("Initial stock registration")
                    .performedBy("System")
                    .build();
            txRepo.save(tx);
        }

        return map(saved);
    }

    @Override
    public Page<MaterialDtos.Response> list(String search, String category, String status, DeliveryStatus deliveryStatus, Pageable p) {
        Page<Material> page;
        String s = (search != null && !search.isBlank()) ? search.trim() : null;
        String cat = (category != null && !category.isBlank()) ? category.trim() : null;

        if (s != null || cat != null) {
            page = repo.searchMaterials(s, cat, p);
        } else if (deliveryStatus != null) {
            page = repo.findByDeliveryStatus(deliveryStatus, p);
        } else {
            page = repo.findAll(p);
        }

        if (status != null && !status.isBlank()) {
            String targetStatus = status.trim().toUpperCase();
            List<MaterialDtos.Response> filtered = page.getContent().stream()
                    .map(this::map)
                    .filter(res -> targetStatus.equals(res.stockStatus()) ||
                                   (targetStatus.equals("LOW") && "LOW_STOCK".equals(res.stockStatus())) ||
                                   (targetStatus.equals("OUT") && "OUT_OF_STOCK".equals(res.stockStatus())) ||
                                   (targetStatus.equals("IN") && "IN_STOCK".equals(res.stockStatus())))
                    .collect(Collectors.toList());
            return new PageImpl<>(filtered, p, filtered.size());
        }

        return page.map(this::map);
    }

    @Override
    public MaterialDtos.Response get(Long id) {
        return map(entity(id));
    }

    @Override
    @Transactional
    public MaterialDtos.Response update(Long id, MaterialDtos.Request r) {
        Material m = entity(id);

        if (r.code() != null && !r.code().isBlank() && repo.existsByCodeAndIdNot(r.code().trim(), id)) {
            throw new DuplicateResourceException("Material code already exists: " + r.code());
        }

        build(m, r);
        return map(repo.save(m));
    }

    @Override
    @Transactional
    public void delete(Long id) {
        Material m = entity(id);
        List<StockTransaction> txs = txRepo.findByMaterialIdOrderByCreatedAtDesc(id);
        txRepo.deleteAll(txs);
        repo.delete(m);
    }

    @Override
    @Transactional
    public MaterialDtos.Response receiveStock(Long id, MaterialDtos.StockTransactionRequest r, String performedBy) {
        Material m = entity(id);

        if (r.quantity() == null || r.quantity().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Received stock quantity must be positive.");
        }

        BigDecimal prevQty = m.getQuantity() != null ? m.getQuantity() : BigDecimal.ZERO;
        BigDecimal newQty = prevQty.add(r.quantity());
        m.setQuantity(newQty);

        Material saved = repo.save(m);

        StockTransaction tx = StockTransaction.builder()
                .material(saved)
                .transactionType("RECEIVE")
                .quantity(r.quantity())
                .previousQuantity(prevQty)
                .newQuantity(newQty)
                .referenceNotes(r.notes() != null && !r.notes().isBlank() ? r.notes() : "Stock received")
                .performedBy(performedBy != null ? performedBy : "Staff User")
                .build();
        txRepo.save(tx);

        return map(saved);
    }

    @Override
    @Transactional
    public MaterialDtos.Response issueStock(Long id, MaterialDtos.StockTransactionRequest r, String performedBy) {
        Material m = entity(id);

        if (r.quantity() == null || r.quantity().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("Issued stock quantity must be positive.");
        }

        BigDecimal prevQty = m.getQuantity() != null ? m.getQuantity() : BigDecimal.ZERO;

        if (prevQty.compareTo(r.quantity()) < 0) {
            throw new IllegalArgumentException("Cannot issue more stock than available. Current stock: " +
                    prevQty + " " + m.getUnit() + ", requested: " + r.quantity());
        }

        BigDecimal newQty = prevQty.subtract(r.quantity());
        m.setQuantity(newQty);

        Material saved = repo.save(m);

        StockTransaction tx = StockTransaction.builder()
                .material(saved)
                .transactionType("ISSUE")
                .quantity(r.quantity())
                .previousQuantity(prevQty)
                .newQuantity(newQty)
                .referenceNotes(r.notes() != null && !r.notes().isBlank() ? r.notes() : "Stock issued to site")
                .performedBy(performedBy != null ? performedBy : "Staff User")
                .build();
        txRepo.save(tx);

        return map(saved);
    }

    @Override
    @Transactional
    public MaterialDtos.Response adjustStock(Long id, MaterialDtos.StockAdjustmentRequest r, String performedBy) {
        Material m = entity(id);

        if (r.newQuantity() == null || r.newQuantity().compareTo(BigDecimal.ZERO) < 0) {
            throw new IllegalArgumentException("Adjusted stock quantity cannot be negative.");
        }

        BigDecimal prevQty = m.getQuantity() != null ? m.getQuantity() : BigDecimal.ZERO;
        BigDecimal newQty = r.newQuantity();
        BigDecimal diff = newQty.subtract(prevQty).abs();
        m.setQuantity(newQty);

        Material saved = repo.save(m);

        StockTransaction tx = StockTransaction.builder()
                .material(saved)
                .transactionType("ADJUSTMENT")
                .quantity(diff)
                .previousQuantity(prevQty)
                .newQuantity(newQty)
                .referenceNotes(r.notes() != null && !r.notes().isBlank() ? r.notes() : "Stock inventory adjustment")
                .performedBy(performedBy != null ? performedBy : "Staff User")
                .build();
        txRepo.save(tx);

        return map(saved);
    }

    @Override
    public List<MaterialDtos.TransactionResponse> getTransactions(Long materialId) {
        entity(materialId); // Verify existence
        return txRepo.findByMaterialIdOrderByCreatedAtDesc(materialId).stream()
                .map(t -> new MaterialDtos.TransactionResponse(
                        t.getId(),
                        t.getMaterial().getId(),
                        t.getMaterial().getName(),
                        t.getTransactionType(),
                        t.getQuantity(),
                        t.getPreviousQuantity(),
                        t.getNewQuantity(),
                        t.getReferenceNotes(),
                        t.getPerformedBy(),
                        t.getCreatedAt()
                ))
                .collect(Collectors.toList());
    }

    private Material entity(Long id) {
        return repo.findById(id).orElseThrow(() -> new ResourceNotFoundException("Material not found: " + id));
    }

    private void build(Material m, MaterialDtos.Request r) {
        if (r.code() != null && !r.code().isBlank()) {
            m.setCode(r.code().trim());
        }
        m.setName(r.name().trim());
        if (r.category() != null) {
            m.setCategory(r.category().trim());
        }
        m.setQuantity(r.quantity() != null ? r.quantity() : BigDecimal.ZERO);
        m.setUnit(r.unit().trim());
        m.setSupplier(r.supplier() != null ? r.supplier().trim() : null);
        m.setUnitPrice(r.unitPrice() != null ? r.unitPrice() : BigDecimal.ZERO);
        m.setStockThreshold(r.stockThreshold() != null ? r.stockThreshold() : BigDecimal.ZERO);
        m.setPurchaseRequest(r.purchaseRequest());
        m.setDeliveryStatus(r.deliveryStatus() != null ? r.deliveryStatus() : DeliveryStatus.DELIVERED);
    }

    private MaterialDtos.Response map(Material m) {
        BigDecimal qty = m.getQuantity() != null ? m.getQuantity() : BigDecimal.ZERO;
        BigDecimal threshold = m.getStockThreshold() != null ? m.getStockThreshold() : BigDecimal.ZERO;
        BigDecimal price = m.getUnitPrice() != null ? m.getUnitPrice() : BigDecimal.ZERO;
        BigDecimal stockValue = qty.multiply(price);

        String stockStatus;
        if (qty.compareTo(BigDecimal.ZERO) <= 0) {
            stockStatus = "OUT_OF_STOCK";
        } else if (qty.compareTo(threshold) <= 0) {
            stockStatus = "LOW_STOCK";
        } else {
            stockStatus = "IN_STOCK";
        }

        return new MaterialDtos.Response(
                m.getId(),
                m.getCode() != null ? m.getCode() : "MAT-" + m.getId(),
                m.getName(),
                m.getCategory() != null ? m.getCategory() : "Construction",
                qty,
                m.getUnit(),
                m.getSupplier() != null ? m.getSupplier() : "N/A",
                price,
                stockValue,
                threshold,
                threshold,
                m.getPurchaseRequest(),
                m.getDeliveryStatus(),
                stockStatus,
                m.getCreatedAt(),
                m.getUpdatedAt()
        );
    }
}
