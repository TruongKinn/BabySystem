package com.mom.shopping.controller;

import com.mom.common.dto.ApiResponse;
import com.mom.shopping.controller.dto.CreateShoppingItemRequest;
import com.mom.shopping.controller.dto.CreateShoppingListRequest;
import com.mom.shopping.controller.dto.ShoppingItemResponse;
import com.mom.shopping.controller.dto.ShoppingListResponse;
import com.mom.shopping.controller.dto.ShoppingPendingCountResponse;
import com.mom.shopping.controller.dto.UpdateShoppingItemCheckedRequest;
import com.mom.shopping.controller.dto.UpdateShoppingItemRequest;
import com.mom.shopping.controller.dto.UpdateShoppingListRequest;
import com.mom.shopping.service.ShoppingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ShoppingController {

    private final ShoppingService shoppingService;

    @PostMapping("/shopping-lists")
    public ApiResponse<ShoppingListResponse> createList(@Valid @RequestBody CreateShoppingListRequest request) {
        return ApiResponse.ok("Shopping list created", shoppingService.createList(request));
    }

    @GetMapping("/shopping-lists")
    public ApiResponse<List<ShoppingListResponse>> getLists(
            @RequestParam("familyId") Long familyId,
            @RequestParam(value = "activeOnly", required = false, defaultValue = "false") boolean activeOnly
    ) {
        return ApiResponse.ok("Success", shoppingService.getLists(familyId, activeOnly));
    }

    @GetMapping("/shopping-lists/{id}")
    public ApiResponse<ShoppingListResponse> getList(@PathVariable("id") Long listId) {
        return ApiResponse.ok("Success", shoppingService.getList(listId));
    }

    @PutMapping("/shopping-lists/{id}")
    public ApiResponse<ShoppingListResponse> updateList(
            @PathVariable("id") Long listId,
            @Valid @RequestBody UpdateShoppingListRequest request
    ) {
        return ApiResponse.ok("Shopping list updated", shoppingService.updateList(listId, request));
    }

    @DeleteMapping("/shopping-lists/{id}")
    public ApiResponse<Object> deleteList(@PathVariable("id") Long listId) {
        shoppingService.deleteList(listId);
        return ApiResponse.ok("Shopping list deleted", null);
    }

    @PostMapping("/shopping-lists/{id}/items")
    public ApiResponse<ShoppingItemResponse> createItem(
            @PathVariable("id") Long listId,
            @Valid @RequestBody CreateShoppingItemRequest request
    ) {
        return ApiResponse.ok("Shopping item created", shoppingService.createItem(listId, request));
    }

    @GetMapping("/shopping-lists/{id}/items")
    public ApiResponse<List<ShoppingItemResponse>> getListItems(
            @PathVariable("id") Long listId,
            @RequestParam(value = "checked", required = false) Boolean checked
    ) {
        return ApiResponse.ok("Success", shoppingService.getListItems(listId, checked));
    }

    @GetMapping("/shopping-items")
    public ApiResponse<List<ShoppingItemResponse>> getFamilyItems(
            @RequestParam("familyId") Long familyId,
            @RequestParam(value = "checked", required = false) Boolean checked
    ) {
        return ApiResponse.ok("Success", shoppingService.getFamilyItems(familyId, checked));
    }

    @PutMapping("/shopping-items/{id}")
    public ApiResponse<ShoppingItemResponse> updateItem(
            @PathVariable("id") Long itemId,
            @Valid @RequestBody UpdateShoppingItemRequest request
    ) {
        return ApiResponse.ok("Shopping item updated", shoppingService.updateItem(itemId, request));
    }

    @PostMapping("/shopping-items/{id}/check")
    public ApiResponse<ShoppingItemResponse> updateChecked(
            @PathVariable("id") Long itemId,
            @Valid @RequestBody UpdateShoppingItemCheckedRequest request
    ) {
        return ApiResponse.ok("Shopping item updated", shoppingService.updateItemChecked(itemId, request));
    }

    @DeleteMapping("/shopping-items/{id}")
    public ApiResponse<Object> deleteItem(@PathVariable("id") Long itemId) {
        shoppingService.deleteItem(itemId);
        return ApiResponse.ok("Shopping item deleted", null);
    }

    @GetMapping("/shopping-items/pending/count")
    public ApiResponse<ShoppingPendingCountResponse> getPendingCount(@RequestParam("familyId") Long familyId) {
        return ApiResponse.ok("Success", shoppingService.getPendingCount(familyId));
    }
}
