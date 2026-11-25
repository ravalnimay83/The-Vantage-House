package in.nimay.billingsoftware.service.impl;

import in.nimay.billingsoftware.entity.CategoryEntity;
import in.nimay.billingsoftware.io.CategoryRequest;
import in.nimay.billingsoftware.io.CategoryResponse;
import in.nimay.billingsoftware.repository.CategoryRepository;
import in.nimay.billingsoftware.repository.ItemRepository;
import in.nimay.billingsoftware.service.CategoryService;
import in.nimay.billingsoftware.service.FileUploadService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;
    private final FileUploadService fileUploadService;
    private final ItemRepository itemRepository;

    @Override
    public CategoryResponse add(CategoryRequest request, MultipartFile file) throws IOException {
        String imgUrl = null;
        if (file != null && !file.isEmpty()) {
            imgUrl = fileUploadService.uploadFile(file);
        }
        CategoryEntity newCategory = convertToEntity(request);
        newCategory.setImgUrl(imgUrl);
        newCategory = categoryRepository.save(newCategory);
        return convertToResponse(newCategory);
    }

    @Override
    public CategoryResponse update(String categoryId, CategoryRequest request, MultipartFile file) throws IOException {
        CategoryEntity existing = categoryRepository.findByCategoryId(categoryId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found: " + categoryId));

        if (request.getName() != null && !request.getName().isBlank()) {
            existing.setName(request.getName().trim());
        }
        if (request.getDescription() != null) {
            existing.setDescription(request.getDescription().trim());
        }
        if (request.getBgColor() != null && !request.getBgColor().isBlank()) {
            existing.setBgColor(request.getBgColor());
        }
        if (file != null && !file.isEmpty()) {
            safeDeleteS3File(existing.getImgUrl());
            existing.setImgUrl(fileUploadService.uploadFile(file));
        }

        existing = categoryRepository.save(existing);
        return convertToResponse(existing);
    }

    @Override
    public List<CategoryResponse> read() {
        return categoryRepository.findAll()
                .stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public void delete(String categoryId) {
        CategoryEntity existingCategory = categoryRepository.findByCategoryId(categoryId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Category not found: " + categoryId));

        Integer count = itemRepository.countByCategory_Id(existingCategory.getId());
        if (count != null && count > 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cannot delete category with " + count + " existing item(s). Delete or reassign those items first."
            );
        }

        safeDeleteS3File(existingCategory.getImgUrl());
        categoryRepository.delete(existingCategory);
    }

    private void safeDeleteS3File(String imgUrl) {
        if (imgUrl != null && imgUrl.contains("amazonaws.com")) {
            try {
                fileUploadService.deleteFile(imgUrl);
            } catch (Exception ignored) {
                // Ignore S3 cleanup failure
            }
        }
    }

    private CategoryResponse convertToResponse(CategoryEntity newCategory) {
        Integer itemsCount = itemRepository.countByCategory_Id(newCategory.getId());
        return CategoryResponse.builder()
                .categoryId(newCategory.getCategoryId())
                .name(newCategory.getName())
                .categoryName(newCategory.getName())
                .description(newCategory.getDescription())
                .bgColor(newCategory.getBgColor())
                .imageUrl(newCategory.getImgUrl())
                .items(itemsCount)
                .createdAt(newCategory.getCreatedAt())
                .updatedAt(newCategory.getUpdatedAt())
                .build();
    }

    private CategoryEntity convertToEntity(CategoryRequest request) {
        return CategoryEntity.builder()
                .categoryId(UUID.randomUUID().toString())
                .name(request.getName())
                .description(request.getDescription())
                .bgColor(request.getBgColor())
                .build();
    }
}
