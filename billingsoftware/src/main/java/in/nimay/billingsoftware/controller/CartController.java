package in.nimay.billingsoftware.controller;

import in.nimay.billingsoftware.entity.CartItemEntity;
import in.nimay.billingsoftware.entity.ItemEntity;
import in.nimay.billingsoftware.io.CartItemDto;
import in.nimay.billingsoftware.repository.CartItemRepository;
import in.nimay.billingsoftware.repository.ItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

@RestController
@RequestMapping("/cart")
@RequiredArgsConstructor
@CrossOrigin("*")
public class CartController {

    private final CartItemRepository cartItemRepository;
    private final ItemRepository itemRepository;

    @GetMapping
    public List<CartItemDto> getMyCart(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return List.of();
        }
        String userEmail = authentication.getName();
        List<CartItemEntity> saved = cartItemRepository.findByUserEmailOrderByIdAsc(userEmail);
        List<CartItemDto> result = new ArrayList<>();
        for (CartItemEntity entity : saved) {
            ItemEntity item = itemRepository.findByItemId(entity.getItemId()).orElse(null);
            if (item == null) continue;
            result.add(CartItemDto.builder()
                    .itemId(item.getItemId())
                    .name(item.getName())
                    .price(item.getPrice())
                    .quantity(entity.getQuantity())
                    .size(entity.getSize() != null ? entity.getSize() : "M")
                    .color(entity.getColor() != null ? entity.getColor() : item.getColor())
                    .imageUrl(item.getImgUrl())
                    .categoryName(item.getCategory() != null ? item.getCategory().getName() : null)
                    .stock(item.getStock())
                    .build());
        }
        return result;
    }

    @PutMapping
    @Transactional
    public List<CartItemDto> syncCart(Authentication authentication, @RequestBody List<CartItemDto> items) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Sign in required to sync cart.");
        }
        String userEmail = authentication.getName();
        cartItemRepository.deleteByUserEmail(userEmail);
        if (items != null && !items.isEmpty()) {
            List<CartItemEntity> toSave = new ArrayList<>();
            for (CartItemDto dto : items) {
                if (dto.getItemId() == null || dto.getQuantity() == null || dto.getQuantity() <= 0) continue;
                toSave.add(CartItemEntity.builder()
                        .userEmail(userEmail)
                        .itemId(dto.getItemId())
                        .size(dto.getSize() != null ? dto.getSize() : "M")
                        .color(dto.getColor())
                        .quantity(dto.getQuantity())
                        .build());
            }
            cartItemRepository.saveAll(toSave);
        }
        return getMyCart(authentication);
    }

    @DeleteMapping
    @Transactional
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearMyCart(Authentication authentication) {
        if (authentication != null && authentication.isAuthenticated()) {
            cartItemRepository.deleteByUserEmail(authentication.getName());
        }
    }
}
