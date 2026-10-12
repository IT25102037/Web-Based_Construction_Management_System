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
        if ("ACCEPT".equals(upper)) return ACCEPTED;
        if ("DECLINE".equals(upper)) return DECLINED;
        if ("APPROVE".equals(upper)) return APPROVED;
        if ("REJECT".equals(upper)) return REJECTED;
        return PENDING;
    }
}
