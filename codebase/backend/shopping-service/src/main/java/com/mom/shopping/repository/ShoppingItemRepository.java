package com.mom.shopping.repository;

import com.mom.shopping.domain.ShoppingItemEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ShoppingItemRepository extends JpaRepository<ShoppingItemEntity, Long> {

    List<ShoppingItemEntity> findByListIdOrderByCreatedAtDesc(Long listId);

    List<ShoppingItemEntity> findByListIdAndCheckedOrderByCreatedAtDesc(Long listId, boolean checked);

    List<ShoppingItemEntity> findByListIdInOrderByCreatedAtDesc(List<Long> listIds);

    List<ShoppingItemEntity> findByListIdInAndCheckedOrderByCreatedAtDesc(List<Long> listIds, boolean checked);

    long countByListIdInAndCheckedFalse(List<Long> listIds);
}
