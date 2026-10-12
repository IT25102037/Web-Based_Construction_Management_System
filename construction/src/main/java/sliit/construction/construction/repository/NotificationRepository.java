package sliit.construction.construction.repository;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import sliit.construction.construction.entity.Notification;
import sliit.construction.construction.entity.User;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    Page<Notification> findByRecipientIdOrderByCreatedAtDesc(Long recipientId, Pageable pageable);

    Page<Notification> findByRecipientIdAndReadFlagOrderByCreatedAtDesc(Long recipientId, Boolean readFlag, Pageable pageable);

    Page<Notification> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<Notification> findByReadFlagOrderByCreatedAtDesc(Boolean readFlag, Pageable pageable);

    List<Notification> findByRecipientIdOrderByCreatedAtDesc(Long recipientId);

    List<Notification> findByRecipientIdAndReadFlagOrderByCreatedAtDesc(Long recipientId, Boolean readFlag);

    List<Notification> findAllByOrderByCreatedAtDesc();

    long countByRecipientIdAndReadFlag(Long recipientId, Boolean readFlag);

    long countByRecipientId(Long recipientId);

    long countByReadFlag(Boolean readFlag);

    void deleteByRecipient(User recipient);

    void deleteByRecipientIdAndReadFlag(Long recipientId, Boolean readFlag);
}
