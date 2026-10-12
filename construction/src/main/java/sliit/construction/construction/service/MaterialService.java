package sliit.construction.construction.service;

import sliit.construction.construction.dto.MaterialDtos;
import sliit.construction.construction.entity.DeliveryStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface MaterialService {

    MaterialDtos.Response create(MaterialDtos.Request r);

    Page<MaterialDtos.Response> list(String search, String category, String status, DeliveryStatus deliveryStatus, Pageable p);

    MaterialDtos.Response get(Long id);

    MaterialDtos.Response update(Long id, MaterialDtos.Request r);

    void delete(Long id);

    MaterialDtos.Response receiveStock(Long id, MaterialDtos.StockTransactionRequest r, String performedBy);

    MaterialDtos.Response issueStock(Long id, MaterialDtos.StockTransactionRequest r, String performedBy);

    MaterialDtos.Response adjustStock(Long id, MaterialDtos.StockAdjustmentRequest r, String performedBy);

    List<MaterialDtos.TransactionResponse> getTransactions(Long materialId);
}
