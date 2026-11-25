package in.nimay.billingsoftware.service.impl;

import in.nimay.billingsoftware.entity.CategoryEntity;
import in.nimay.billingsoftware.entity.ItemEntity;
import in.nimay.billingsoftware.io.ItemRequest;
import in.nimay.billingsoftware.io.ItemResponse;
import in.nimay.billingsoftware.repository.CategoryRepository;
import in.nimay.billingsoftware.repository.ItemRepository;
import in.nimay.billingsoftware.service.FileUploadService;
import in.nimay.billingsoftware.service.ItemService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ItemServiceImpl implements ItemService {

    private final FileUploadService fileUploadService;
    private final CategoryRepository categoryRepository;
    private final ItemRepository itemRepository;

    @Override
    public ItemResponse add(ItemRequest request, MultipartFile file) {
        String imgUrl = null;
        if (file != null && !file.isEmpty()) {
            try {
                imgUrl = fileUploadService.uploadFile(file);
            } catch (IOException e) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to upload image: " + e.getMessage(), e);
            }
        } else if (request.getImageUrl() != null && !request.getImageUrl().isBlank()) {
            imgUrl = request.getImageUrl();
        } else if (request.getImgUrl() != null && !request.getImgUrl().isBlank()) {
            imgUrl = request.getImgUrl();
        }

        ItemEntity newItem = convertToEntity(request);
        CategoryEntity existingCategory = categoryRepository.findByCategoryId(request.getCategoryId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found: " + request.getCategoryId()));
        newItem.setCategory(existingCategory);
        newItem.setImgUrl(imgUrl);
        newItem = itemRepository.save(newItem);
        return convertToResponse(newItem);
    }

    @Override
    public ItemResponse updateItem(String itemId, ItemRequest request, MultipartFile file) {
        ItemEntity existingItem = itemRepository.findByItemId(itemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found: " + itemId));

        if (request.getName() != null && !request.getName().isBlank()) {
            existingItem.setName(request.getName().trim());
        }
        if (request.getDescription() != null) {
            existingItem.setDescription(request.getDescription().trim());
        }
        if (request.getPrice() != null) {
            existingItem.setPrice(request.getPrice());
        }
        if (request.getOriginalPrice() != null) {
            existingItem.setOriginalPrice(request.getOriginalPrice());
        }
        if (request.getBrand() != null) {
            existingItem.setBrand(request.getBrand().trim());
        }
        if (request.getSizes() != null) {
            existingItem.setSizes(request.getSizes().trim());
        }
        if (request.getColor() != null) {
            existingItem.setColor(request.getColor().trim());
        }
        if (request.getFabric() != null) {
            existingItem.setFabric(request.getFabric().trim());
        }
        if (request.getStock() != null) {
            existingItem.setStock(request.getStock());
        }
        if (request.getCategoryId() != null && !request.getCategoryId().isBlank()) {
            CategoryEntity category = categoryRepository.findByCategoryId(request.getCategoryId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found: " + request.getCategoryId()));
            existingItem.setCategory(category);
        }

        if (file != null && !file.isEmpty()) {
            try {
                safeDeleteS3File(existingItem.getImgUrl());
                String imgUrl = fileUploadService.uploadFile(file);
                existingItem.setImgUrl(imgUrl);
            } catch (IOException e) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to upload image: " + e.getMessage(), e);
            }
        } else if (request.getImageUrl() != null && !request.getImageUrl().isBlank()) {
            existingItem.setImgUrl(request.getImageUrl());
        } else if (request.getImgUrl() != null && !request.getImgUrl().isBlank()) {
            existingItem.setImgUrl(request.getImgUrl());
        }

        existingItem = itemRepository.save(existingItem);
        return convertToResponse(existingItem);
    }

    private ItemResponse convertToResponse(ItemEntity newItem) {
        return ItemResponse.builder()
                .itemId(newItem.getItemId())
                .name(newItem.getName())
                .description(newItem.getDescription())
                .price(newItem.getPrice())
                .originalPrice(newItem.getOriginalPrice())
                .brand(newItem.getBrand())
                .sizes(newItem.getSizes())
                .color(newItem.getColor())
                .fabric(newItem.getFabric())
                .stock(newItem.getStock())
                .imageUrl(newItem.getImgUrl())
                .categoryName(newItem.getCategory() != null ? newItem.getCategory().getName() : null)
                .categoryId(newItem.getCategory() != null ? newItem.getCategory().getCategoryId() : null)
                .createdAt(newItem.getCreatedAt())
                .updatedAt(newItem.getUpdatedAt())
                .build();
    }

    private ItemEntity convertToEntity(ItemRequest request) {
        return ItemEntity.builder()
                .itemId(UUID.randomUUID().toString())
                .name(request.getName())
                .description(request.getDescription())
                .price(request.getPrice())
                .originalPrice(request.getOriginalPrice())
                .brand(request.getBrand())
                .sizes(request.getSizes())
                .color(request.getColor())
                .fabric(request.getFabric())
                .stock(request.getStock() != null ? request.getStock() : 25)
                .build();
    }

    @Override
    public List<ItemResponse> fetchItem() {
        return itemRepository.findAll()
                .stream()
                .map(this::convertToResponse)
                .toList();
    }

    @Override
    public void deleteItem(String itemId) {
        ItemEntity existingItem = itemRepository.findByItemId(itemId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found: " + itemId));
        safeDeleteS3File(existingItem.getImgUrl());
        itemRepository.delete(existingItem);
    }

    private void safeDeleteS3File(String imgUrl) {
        if (imgUrl != null && imgUrl.contains("amazonaws.com")) {
            try {
                fileUploadService.deleteFile(imgUrl);
            } catch (Exception ignored) {
                // Ignore S3 cleanup errors
            }
        }
    }
}
