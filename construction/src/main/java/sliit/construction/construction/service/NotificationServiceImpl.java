package sliit.construction.construction.service;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import sliit.construction.construction.dto.NotificationDtos;
import sliit.construction.construction.entity.Notification;
import sliit.construction.construction.entity.User;
import sliit.construction.construction.exception.ResourceNotFoundException;
import sliit.construction.construction.repository.NotificationRepository;
import sliit.construction.construction.repository.UserRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository repo;
    private final UserRepository users;

    public NotificationServiceImpl(NotificationRepository repo, UserRepository users) {
        this.repo = repo;
        this.users = users;
    }

    @Override
    public NotificationDtos.Response create(NotificationDtos.Request r) {
        User recipient = user(r.recipientId());
        Notification n = Notification.builder()
                .title(r.title())
                .message(r.message())
                .type(r.type() != null ? r.type().toUpperCase() : "SYSTEM")
                .readFlag(false)
                .recipient(recipient)
                .build();
        return map(repo.save(n));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<NotificationDtos.Response> list(Long recipientId, Boolean read, Pageable p) {
        Page<Notification> page;
        if (recipientId != null && read != null) {
            page = repo.findByRecipientIdAndReadFlagOrderByCreatedAtDesc(recipientId, read, p);
        } else if (recipientId != null) {
            page = repo.findByRecipientIdOrderByCreatedAtDesc(recipientId, p);
        } else if (read != null) {
            page = repo.findByReadFlagOrderByCreatedAtDesc(read, p);
        } else {
            page = repo.findAllByOrderByCreatedAtDesc(p);
        }
        return page.map(this::map);
    }

    @Override
    @Transactional(readOnly = true)
    public List<NotificationDtos.Response> listAll(Long recipientId, Boolean read) {
        List<Notification> list;
        if (recipientId != null && read != null) {
            list = repo.findByRecipientIdAndReadFlagOrderByCreatedAtDesc(recipientId, read);
        } else if (recipientId != null) {
            list = repo.findByRecipientIdOrderByCreatedAtDesc(recipientId);
        } else {
            list = repo.findAllByOrderByCreatedAtDesc();
        }
        return list.stream().map(this::map).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public NotificationDtos.Response get(Long id) {
        return map(entity(id));
    }

    @Override
    public NotificationDtos.Response markAsRead(Long id) {
        Notification n = entity(id);
        n.setReadFlag(true);
        Notification saved = repo.save(n);
        return map(saved);
    }

    @Override
    public NotificationDtos.Response markAsUnread(Long id) {
        Notification n = entity(id);
        n.setReadFlag(false);
        Notification saved = repo.save(n);
        return map(saved);
    }

    @Override
    public NotificationDtos.Response toggleRead(Long id) {
        Notification n = entity(id);
        n.setReadFlag(!Boolean.TRUE.equals(n.getReadFlag()));
        Notification saved = repo.save(n);
        return map(saved);
    }

    @Override
    public void markAllAsRead(Long recipientId) {
        List<Notification> list = recipientId != null
                ? repo.findByRecipientIdAndReadFlagOrderByCreatedAtDesc(recipientId, false)
                : repo.findAllByOrderByCreatedAtDesc().stream().filter(n -> !Boolean.TRUE.equals(n.getReadFlag())).collect(Collectors.toList());

        for (Notification n : list) {
            n.setReadFlag(true);
        }
        repo.saveAll(list);
    }

    @Override
    @Transactional(readOnly = true)
    public NotificationDtos.UnreadCountResponse getUnreadCount(Long recipientId) {
        long unread = recipientId != null
                ? repo.countByRecipientIdAndReadFlag(recipientId, false)
                : repo.countByReadFlag(false);

        long total = recipientId != null
                ? repo.countByRecipientId(recipientId)
                : repo.count();

        return new NotificationDtos.UnreadCountResponse(unread, total);
    }

    @Override
    public NotificationDtos.Response update(Long id, NotificationDtos.UpdateRequest r) {
        Notification n = entity(id);
        if (r.title() != null) n.setTitle(r.title());
        if (r.message() != null) n.setMessage(r.message());
        if (r.type() != null) n.setType(r.type());
        if (r.readFlag() != null) n.setReadFlag(r.readFlag());
        if (r.recipientId() != null) n.setRecipient(user(r.recipientId()));
        return map(repo.save(n));
    }

    @Override
    public void delete(Long id) {
        repo.delete(entity(id));
    }

    @Override
    public void clearAll(Long recipientId) {
        if (recipientId != null) {
            repo.deleteByRecipientIdAndReadFlag(recipientId, true);
        }
    }

    private Notification entity(Long id) {
        return repo.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with ID: " + id));
    }

    private User user(Long id) {
        return users.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recipient not found with ID: " + id));
    }

    private NotificationDtos.Response map(Notification n) {
        String recipientName = n.getRecipient() != null ? n.getRecipient().getFullName() : "User";
        Long recipientId = n.getRecipient() != null ? n.getRecipient().getId() : null;

        return new NotificationDtos.Response(
                n.getId(),
                n.getTitle(),
                n.getMessage(),
                n.getReadFlag() != null ? n.getReadFlag() : false,
                n.getType() != null ? n.getType() : "SYSTEM",
                recipientId,
                recipientName,
                n.getCreatedAt(),
                n.getUpdatedAt()
        );
    }
}
