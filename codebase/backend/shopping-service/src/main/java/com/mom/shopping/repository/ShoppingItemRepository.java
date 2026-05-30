package com.mom.shopping.repository;

import com.mom.shopping.domain.ShoppingItemEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ShoppingItemRepository extends JpaRepository<ShoppingItemEntity, Long> {

    List<ShoppingItemEntity> findByListIdOrderByCreatedAtDesc(Long listId);

    List<ShoppingItemEntity> findByListIdAndCheckedOrderByCreatedAtDesc(Long listId, boolean checked);

    List<ShoppingItemEntity> findByListIdInOrderByCreatedAtDesc(List<Long> listIds);

    List<ShoppingItemEntity> findByListIdInAndCheckedOrderByCreatedAtDesc(List<Long> listIds, boolean checked);

    Page<ShoppingItemEntity> findByListIdInOrderByCreatedAtDesc(List<Long> listIds, Pageable pageable);

    Page<ShoppingItemEntity> findByListIdInAndCheckedOrderByCreatedAtDesc(List<Long> listIds, boolean checked, Pageable pageable);

    Page<ShoppingItemEntity> findByListIdInAndItemNameContainingIgnoreCaseOrderByCreatedAtDesc(List<Long> listIds, String itemName, Pageable pageable);

    Page<ShoppingItemEntity> findByListIdInAndCheckedAndItemNameContainingIgnoreCaseOrderByCreatedAtDesc(List<Long> listIds, boolean checked, String itemName, Pageable pageable);

    long countByListIdInAndCheckedFalse(List<Long> listIds);
}

