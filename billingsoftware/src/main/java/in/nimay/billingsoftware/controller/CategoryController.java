package in.nimay.billingsoftware.controller;

import in.nimay.billingsoftware.io.CategoryRequest;
import in.nimay.billingsoftware.io.CategoryResponse;
import in.nimay.billingsoftware.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.List;

@RestController
@RequiredArgsConstructor
@CrossOrigin("*")
public class CategoryController {

    private final CategoryService categoryService;

    @PostMapping(value = {"/admin/categories", "/categories/admin/categories"}, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public CategoryResponse addCategory(
            @RequestPart("category") String categoryString,
            @RequestPart(value = "file", required = false) MultipartFile file) {
        ObjectMapper objectMapper = new ObjectMapper();
        try {
            CategoryRequest request = objectMapper.readValue(categoryString, CategoryRequest.class);
            return categoryService.add(request, file);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unable to process category: " + ex.getMessage());
        }
    }

    @PutMapping(value = {"/admin/categories/{categoryId}"}, consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public CategoryResponse updateCategory(
            @PathVariable String categoryId,
            @RequestPart("category") String categoryString,
            @RequestPart(value = "file", required = false) MultipartFile file) {
        ObjectMapper objectMapper = new ObjectMapper();
        try {
            CategoryRequest request = objectMapper.readValue(categoryString, CategoryRequest.class);
            return categoryService.update(categoryId, request, file);
        } catch (IOException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unable to update category: " + ex.getMessage());
        }
    }

    @GetMapping({"/categories", "/admin/categories"})
    public List<CategoryResponse> fetchCategories() {
        return categoryService.read();
    }

    @ResponseStatus(HttpStatus.NO_CONTENT)
    @DeleteMapping({"/admin/categories/{categoryId}", "/categories/admin/categories/{categoryId}"})
    public void remove(@PathVariable String categoryId) {
        categoryService.delete(categoryId);
    }
}
