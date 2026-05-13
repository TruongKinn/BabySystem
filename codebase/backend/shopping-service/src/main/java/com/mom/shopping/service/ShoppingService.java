package com.mom.shopping.service;

import com.mom.common.exception.ResourceNotFoundException;
import com.mom.shopping.controller.dto.CreateShoppingItemRequest;
import com.mom.shopping.controller.dto.CreateShoppingListRequest;
import com.mom.shopping.controller.dto.ShoppingItemResponse;
import com.mom.shopping.controller.dto.ShoppingListResponse;
import com.mom.shopping.controller.dto.ShoppingPendingCountResponse;
import com.mom.shopping.controller.dto.UpdateShoppingItemCheckedRequest;
import com.mom.shopping.controller.dto.UpdateShoppingItemRequest;
import com.mom.shopping.controller.dto.UpdateShoppingListRequest;
import com.mom.shopping.domain.ShoppingItemEntity;
import com.mom.shopping.domain.ShoppingListEntity;
import com.mom.shopping.repository.ShoppingItemRepository;
import com.mom.shopping.repository.ShoppingListRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ShoppingService {

    private final ShoppingListRepository shoppingListRepository;
    private final ShoppingItemRepository shoppingItemRepository;

    @Transactional
    public ShoppingListResponse createList(CreateShoppingListRequest request) {
        ShoppingListEntity list = new ShoppingListEntity();
        list.setFamilyId(request.familyId());
        list.setName(request.name().trim());
        list.setActive(request.active() == null || request.active());
        return toShoppingListResponse(shoppingListRepository.save(list));
    }

    public List<ShoppingListResponse> getLists(Long familyId, boolean activeOnly) {
        List<ShoppingListEntity> lists = activeOnly
                ? shoppingListRepository.findByFamilyIdAndActiveTrueOrderByUpdatedAtDesc(familyId)
                : shoppingListRepository.findByFamilyIdOrderByUpdatedAtDesc(familyId);
        return lists.stream().map(this::toShoppingListResponse).toList();
    }

    public ShoppingListResponse getList(Long listId) {
        return toShoppingListResponse(getListEntity(listId));
    }

    @Transactional
    public ShoppingListResponse updateList(Long listId, UpdateShoppingListRequest request) {
        ShoppingListEntity list = getListEntity(listId);
        if (request.name() != null) {
            list.setName(request.name().trim());
        }
        if (request.active() != null) {
            list.setActive(request.active());
        }
        return toShoppingListResponse(shoppingListRepository.save(list));
    }

    @Transactional
    public void deleteList(Long listId) {
        ShoppingListEntity list = getListEntity(listId);
        shoppingListRepository.delete(list);
    }

    @Transactional
    public ShoppingItemResponse createItem(Long listId, CreateShoppingItemRequest request) {
        ShoppingListEntity list = getListEntity(listId);
        ShoppingItemEntity item = new ShoppingItemEntity();
        item.setListId(listId);
        item.setItemName(request.itemName().trim());
        item.setQuantity(trimToNull(request.quantity()));
        item.setNote(trimToNull(request.note()));
        item.setChecked(Boolean.TRUE.equals(request.checked()));
        ShoppingItemEntity saved = shoppingItemRepository.save(item);
        return toShoppingItemResponse(saved, list.getName(), list.getFamilyId());
    }

    public List<ShoppingItemResponse> getListItems(Long listId, Boolean checked) {
        ShoppingListEntity list = getListEntity(listId);
        List<ShoppingItemEntity> items = checked == null
                ? shoppingItemRepository.findByListIdOrderByCreatedAtDesc(listId)
                : shoppingItemRepository.findByListIdAndCheckedOrderByCreatedAtDesc(listId, checked);
        return items.stream()
                .map(item -> toShoppingItemResponse(item, list.getName(), list.getFamilyId()))
                .toList();
    }

    public List<ShoppingItemResponse> getFamilyItems(Long familyId, Boolean checked) {
        List<Long> listIds = shoppingListRepository.findIdsByFamilyId(familyId);
        if (listIds.isEmpty()) {
            return Collections.emptyList();
        }

        List<ShoppingListEntity> lists = shoppingListRepository.findAllById(listIds);
        Map<Long, ShoppingListEntity> listMap = lists.stream()
                .collect(Collectors.toMap(ShoppingListEntity::getId, Function.identity()));

        List<ShoppingItemEntity> items = checked == null
                ? shoppingItemRepository.findByListIdInOrderByCreatedAtDesc(listIds)
                : shoppingItemRepository.findByListIdInAndCheckedOrderByCreatedAtDesc(listIds, checked);
        return items.stream()
                .map(item -> {
                    ShoppingListEntity list = listMap.get(item.getListId());
                    return toShoppingItemResponse(
                            item,
                            list != null ? list.getName() : "Unknown",
                            list != null ? list.getFamilyId() : familyId
                    );
                })
                .toList();
    }

    @Transactional
    public ShoppingItemResponse updateItem(Long itemId, UpdateShoppingItemRequest request) {
        ShoppingItemEntity item = getItemEntity(itemId);
        ShoppingListEntity list = getListEntity(item.getListId());

        if (request.itemName() != null) {
            item.setItemName(request.itemName().trim());
        }
        if (request.quantity() != null) {
            item.setQuantity(trimToNull(request.quantity()));
        }
        if (request.note() != null) {
            item.setNote(trimToNull(request.note()));
        }
        if (request.checked() != null) {
            item.setChecked(request.checked());
        }
        ShoppingItemEntity saved = shoppingItemRepository.save(item);
        return toShoppingItemResponse(saved, list.getName(), list.getFamilyId());
    }

    @Transactional
    public ShoppingItemResponse updateItemChecked(Long itemId, UpdateShoppingItemCheckedRequest request) {
        ShoppingItemEntity item = getItemEntity(itemId);
        ShoppingListEntity list = getListEntity(item.getListId());
        item.setChecked(request.checked());
        ShoppingItemEntity saved = shoppingItemRepository.save(item);
        return toShoppingItemResponse(saved, list.getName(), list.getFamilyId());
    }

    @Transactional
    public void deleteItem(Long itemId) {
        ShoppingItemEntity item = getItemEntity(itemId);
        shoppingItemRepository.delete(item);
    }

    public ShoppingPendingCountResponse getPendingCount(Long familyId) {
        List<Long> listIds = shoppingListRepository.findIdsByFamilyId(familyId);
        if (listIds.isEmpty()) {
            return new ShoppingPendingCountResponse(familyId, 0);
        }
        long pendingCount = shoppingItemRepository.countByListIdInAndCheckedFalse(listIds);
        return new ShoppingPendingCountResponse(familyId, pendingCount);
    }

    private ShoppingListEntity getListEntity(Long listId) {
        return shoppingListRepository.findById(listId)
                .orElseThrow(() -> new ResourceNotFoundException("Shopping list not found"));
    }

    private ShoppingItemEntity getItemEntity(Long itemId) {
        return shoppingItemRepository.findById(itemId)
                .orElseThrow(() -> new ResourceNotFoundException("Shopping item not found"));
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private ShoppingListResponse toShoppingListResponse(ShoppingListEntity list) {
        return new ShoppingListResponse(
                list.getId(),
                list.getFamilyId(),
                list.getName(),
                list.isActive()
        );
    }

    private ShoppingItemResponse toShoppingItemResponse(ShoppingItemEntity item, String listName, Long familyId) {
        return new ShoppingItemResponse(
                item.getId(),
                item.getListId(),
                listName,
                familyId,
                item.getItemName(),
                item.getQuantity(),
                item.getNote(),
                item.isChecked()
        );
    }
}
