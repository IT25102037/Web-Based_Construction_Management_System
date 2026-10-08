package lk.sliit.web_based_construction_management_system.exception;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {
    record ErrorResponse(LocalDateTime timestamp,int status,String error,String message,Map<String,String> validationErrors) {}

    @ExceptionHandler(ResourceNotFoundException.class)
    ResponseEntity<ErrorResponse> notFound(ResourceNotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(new ErrorResponse(LocalDateTime.now(),404,"Not Found",ex.getMessage(),Map.of()));
    }
    @ExceptionHandler(DuplicateResourceException.class)
    ResponseEntity<ErrorResponse> duplicate(DuplicateResourceException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(new ErrorResponse(LocalDateTime.now(),409,"Conflict",ex.getMessage(),Map.of()));
    }
    @ExceptionHandler(UnauthorizedActionException.class)
    ResponseEntity<ErrorResponse> unauthorized(UnauthorizedActionException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(new ErrorResponse(LocalDateTime.now(),403,"Forbidden",ex.getMessage(),Map.of()));
    }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ErrorResponse> validation(MethodArgumentNotValidException ex) {
        Map<String,String> errors = ex.getBindingResult().getFieldErrors().stream()
            .collect(Collectors.toMap(e->e.getField(), e->e.getDefaultMessage()==null?"Invalid value":e.getDefaultMessage(), (a,b)->a, LinkedHashMap::new));
        return ResponseEntity.badRequest().body(new ErrorResponse(LocalDateTime.now(),400,"Validation Failed","Check the request fields",errors));
    }
    @ExceptionHandler(org.springframework.security.authentication.BadCredentialsException.class)
    ResponseEntity<ErrorResponse> badCredentials(org.springframework.security.authentication.BadCredentialsException ex) {
        String msg = (ex.getMessage() == null || ex.getMessage().equalsIgnoreCase("Bad credentials"))
                ? "Invalid username/email or password."
                : ex.getMessage();
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorResponse(LocalDateTime.now(), 401, "Unauthorized", msg, Map.of()));
    }

    @ExceptionHandler(org.springframework.security.core.AuthenticationException.class)
    ResponseEntity<ErrorResponse> authenticationException(org.springframework.security.core.AuthenticationException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(new ErrorResponse(LocalDateTime.now(), 401, "Unauthorized", ex.getMessage() == null ? "Authentication failed" : ex.getMessage(), Map.of()));
    }

    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    ResponseEntity<ErrorResponse> accessDenied(org.springframework.security.access.AccessDeniedException ex) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(new ErrorResponse(LocalDateTime.now(), 403, "Forbidden", ex.getMessage() == null ? "Access denied: you do not have permission to access this resource." : ex.getMessage(), Map.of()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    ResponseEntity<ErrorResponse> illegalArgument(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new ErrorResponse(LocalDateTime.now(), 400, "Bad Request", ex.getMessage(), Map.of()));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ErrorResponse> generic(Exception ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new ErrorResponse(LocalDateTime.now(),500,"Internal Server Error",ex.getMessage()==null?"Unexpected error":ex.getMessage(),Map.of()));
    }
}
