package sliit.construction.construction.entity;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum MaterialRequestStatus {

    PENDING,
    APPROVED,
    REJECTED,
    FULFILLED,
    ACCEPTED,
    DECLINED;

    @JsonCreator
    public static MaterialRequestStatus fromValue(String value) {
        if (value == null || value.isBlank()) {
            return PENDING;
        }
        String upper = value.trim().toUpperCase();
        for (MaterialRequestStatus status : values()) {
            if (status.name().equals(upper)) {
                return status;
            }
        }
        if (upper.contains("ACCEPT")) return ACCEPTED;
        if (upper.contains("DECLINE")) return DECLINED;
        if (upper.contains("APPROV")) return APPROVED;
        if (upper.contains("REJECT")) return REJECTED;
        if (upper.contains("FULFILL")) return FULFILLED;
        return PENDING;
    }
}
