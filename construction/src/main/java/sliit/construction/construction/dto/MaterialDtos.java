package sliit.construction.construction.dto;

import sliit.construction.construction.entity.DeliveryStatus;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public final class MaterialDtos {

    private MaterialDtos() {}

    public record Request(
            @Size(max = 50)
            String code,

            @NotBlank(message = "Material name is required.")
            @Size(max = 150)
            String name,

            @Size(max = 80)
            String category,

            @NotNull(message = "Quantity cannot be null.")
            @PositiveOrZero(message = "Quantity cannot be negative.")
            BigDecimal quantity,

            @NotBlank(message = "Unit is required.")
            @Size(max = 30)
            String unit,

            @Size(max = 150)
            String supplier,

            @PositiveOrZero(message = "Unit price cannot be negative.")
            BigDecimal unitPrice,

            @NotNull(message = "Minimum stock level cannot be null.")
            @PositiveOrZero(message = "Minimum stock cannot be negative.")
            BigDecimal stockThreshold,

            @Size(max = 1000)
            String purchaseRequest,

            DeliveryStatus deliveryStatus
    ) {}

    public record Response(
            Long id,
            String code,
            String name,
            String category,
            BigDecimal quantity,
            String unit,
            String supplier,
            BigDecimal unitPrice,
            BigDecimal stockValue,
            BigDecimal stockThreshold,
            BigDecimal minimumStock,
            String purchaseRequest,
            DeliveryStatus deliveryStatus,
            String stockStatus,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {}

    public record StockTransactionRequest(
            @NotNull(message = "Transaction quantity is required.")
            @Positive(message = "Transaction quantity must be greater than zero.")
            BigDecimal quantity,

            @Size(max = 500)
            String notes
    ) {}

    public record StockAdjustmentRequest(
            @NotNull(message = "New quantity is required.")
            @PositiveOrZero(message = "Adjusted quantity cannot be negative.")
            BigDecimal newQuantity,

            @Size(max = 500)
            String notes
    ) {}

    public record TransactionResponse(
            Long id,
            Long materialId,
            String materialName,
            String transactionType,
            BigDecimal quantity,
            BigDecimal previousQuantity,
            BigDecimal newQuantity,
            String referenceNotes,
            String performedBy,
            LocalDateTime createdAt
    ) {}
}
