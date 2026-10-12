package sliit.construction.construction.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import sliit.construction.construction.dto.NotificationDtos;

import java.util.List;

public interface NotificationService {

    NotificationDtos.Response create(NotificationDtos.Request request);

    Page<NotificationDtos.Response> list(Long recipientId, Boolean read, Pageable pageable);

    List<NotificationDtos.Response> listAll(Long recipientId, Boolean read);

    NotificationDtos.Response get(Long id);

    NotificationDtos.Response markAsRead(Long id);

    NotificationDtos.Response markAsUnread(Long id);

    NotificationDtos.Response toggleRead(Long id);

    void markAllAsRead(Long recipientId);

    NotificationDtos.UnreadCountResponse getUnreadCount(Long recipientId);

    NotificationDtos.Response update(Long id, NotificationDtos.UpdateRequest request);

    void delete(Long id);

    void clearAll(Long recipientId);
}
