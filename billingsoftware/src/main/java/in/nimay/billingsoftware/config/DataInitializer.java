package in.nimay.billingsoftware.config;

import in.nimay.billingsoftware.entity.CategoryEntity;
import in.nimay.billingsoftware.entity.ItemEntity;
import in.nimay.billingsoftware.entity.UserEntity;
import in.nimay.billingsoftware.repository.CategoryRepository;
import in.nimay.billingsoftware.repository.ItemRepository;
import in.nimay.billingsoftware.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    public static final String ADMIN_EMAIL = "ravalnimay83@gmail.com";
    private static final Set<String> LEGACY_NON_CLOTHING_CATEGORIES = Set.of(
            "Cute Cats", "Cakes", "NetflixThings", "FastFood", "Superheros", "Namosu"
    );

    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final ItemRepository itemRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        ensureSingleAdmin();
        replaceLegacyWithClothingCatalog();
    }

    private void ensureSingleAdmin() {
        List<UserEntity> allUsers = userRepository.findAll();
        boolean adminExists = false;

        for (UserEntity user : allUsers) {
            if (ADMIN_EMAIL.equalsIgnoreCase(user.getEmail())) {
                adminExists = true;
                user.setRole("ROLE_ADMIN");
                user.setPassword(passwordEncoder.encode("Nimay@3186"));
                if (user.getName() == null || user.getName().isBlank()) {
                    user.setName("Nimay Raval");
                }
                userRepository.save(user);
            } else if ("ROLE_ADMIN".equals(user.getRole())) {
                // Enforce single-admin rule: only ravalnimay83@gmail.com is ROLE_ADMIN
                user.setRole("ROLE_USER");
                userRepository.save(user);
            }
        }

        if (!adminExists) {
            UserEntity admin = UserEntity.builder()
                    .userId(UUID.randomUUID().toString())
                    .name("Nimay Raval")
                    .email(ADMIN_EMAIL)
                    .password(passwordEncoder.encode("Nimay@3186"))
                    .role("ROLE_ADMIN")
                    .provider("LOCAL")
                    .build();
            userRepository.save(admin);
            log.info("Created single admin account: {}", ADMIN_EMAIL);
        }
    }

    private void replaceLegacyWithClothingCatalog() {
        List<CategoryEntity> existing = categoryRepository.findAll();
        boolean hasLegacy = existing.stream().anyMatch(c -> LEGACY_NON_CLOTHING_CATEGORIES.contains(c.getName()));

        if (hasLegacy) {
            log.info("Removing legacy non-clothing categories and items...");
            itemRepository.deleteAll();
            categoryRepository.deleteAll();
            existing = List.of();
        }

        if (!existing.isEmpty()) {
            return;
        }

        log.info("Seeding Clothing Wear categories and items...");

        CategoryEntity tshirts = saveCategory(
                "T-Shirts",
                "Oversized, crewneck, and everyday breathable cotton tees",
                "#2d4c24",
                "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80"
        );
        CategoryEntity shirts = saveCategory(
                "Shirts",
                "Casual linen, oxford, and tailored button-down shirts",
                "#1e3a5f",
                "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80"
        );
        CategoryEntity pants = saveCategory(
                "Pants & Trousers",
                "Tailored chinos, cargo pants, and relaxed everyday trousers",
                "#4a3f35",
                "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=600&q=80"
        );
        CategoryEntity hoodies = saveCategory(
                "Hoodies & Sweatshirts",
                "Heavyweight fleece hoodies and minimalist crewnecks",
                "#374151",
                "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=600&q=80"
        );
        CategoryEntity jackets = saveCategory(
                "Jackets & Outerwear",
                "Denim truckers, utility overshirts, and bomber jackets",
                "#3f2e21",
                "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=600&q=80"
        );
        CategoryEntity denim = saveCategory(
                "Denim & Jeans",
                "Slim, straight, and relaxed fit selvedge denim",
                "#1f2937",
                "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=600&q=80"
        );

        saveItem("Olive Oversized Heavyweight Tee", tshirts, "799.00", "1199.00",
                "BizBill Basics", "S, M, L, XL", "Olive Green", "100% Combed Cotton (240 GSM)", 40,
                "Relaxed drop-shoulder oversized t-shirt crafted from breathable heavyweight combed cotton.",
                "https://images.unsplash.com/photo-1583743814966-8936f5b7be1a?auto=format&fit=crop&w=600&q=80");

        saveItem("Essential Crewneck White Tee", tshirts, "599.00", "899.00",
                "UrbanWeave", "XS, S, M, L, XL", "Off White", "100% Organic Cotton", 55,
                "Crisp everyday crewneck t-shirt with reinforced collar ribbing and ultra-soft finish.",
                "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=600&q=80");

        saveItem("Breezy Linen Button-Down Shirt", shirts, "1499.00", "1999.00",
                "Coastline", "S, M, L, XL", "Sage Green", "55% Linen, 45% Cotton", 28,
                "Breathable linen-blend shirt with mother-of-pearl buttons, ideal for warm-weather styling.",
                "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=600&q=80");

        saveItem("Classic Oxford Formal Shirt", shirts, "1299.00", "1799.00",
                "Savile Loom", "M, L, XL, XXL", "Sky Blue", "100% Oxford Cotton", 32,
                "Tailored button-down Oxford shirt designed for sharp office and smart-casual wear.",
                "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=600&q=80");

        saveItem("Tailored Stretch Chino Trousers", pants, "1599.00", "2199.00",
                "UrbanWeave", "30, 32, 34, 36", "Khaki Beige", "98% Cotton, 2% Elastane", 35,
                "Slim-tapered chino trousers with 4-way comfort stretch and clean hidden pocket detailing.",
                "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=600&q=80");

        saveItem("Utility Six-Pocket Cargo Pants", pants, "1799.00", "2499.00",
                "StreetCraft", "S, M, L, XL", "Charcoal", "Cotton Ripstop", 22,
                "Relaxed cargo trousers featuring bellows utility pockets and adjustable ankle toggles.",
                "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?auto=format&fit=crop&w=600&q=80");

        saveItem("Heavyweight Fleece Pullover Hoodie", hoodies, "1899.00", "2599.00",
                "BizBill Studio", "S, M, L, XL, XXL", "Forest Green", "400 GSM Cotton Fleece", 30,
                "Plush brushed-fleece hoodie with double-lined hood and structured kangaroo pocket.",
                "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=600&q=80");

        saveItem("Minimalist Zip-Up Sweatshirt", hoodies, "1699.00", "2299.00",
                "UrbanWeave", "S, M, L, XL", "Jet Black", "Cotton French Terry", 25,
                "Clean full-zip sweatshirt with brushed metal zipper and tailored ribbed cuffs.",
                "https://images.unsplash.com/photo-1578768079052-aa76e52ff62e?auto=format&fit=crop&w=600&q=80");

        saveItem("Vintage Wash Denim Trucker Jacket", jackets, "2799.00", "3599.00",
                "RawHeritage", "S, M, L, XL", "Indigo Blue", "12oz Rigid Denim", 18,
                "Timeless trucker jacket with antique brass hardware and dual chest flap pockets.",
                "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=600&q=80");

        saveItem("Slim Tapered Dark Indigo Jeans", denim, "1999.00", "2699.00",
                "RawHeritage", "30, 32, 34, 36", "Dark Indigo", "99% Cotton, 1% Lycra Denim", 40,
                "Classic 5-pocket slim tapered jeans crafted for durability and all-day comfort.",
                "https://images.unsplash.com/photo-1542272604-787c3835535d?auto=format&fit=crop&w=600&q=80");
    }

    private CategoryEntity saveCategory(String name, String description, String bgColor, String imgUrl) {
        return categoryRepository.save(CategoryEntity.builder()
                .categoryId(UUID.randomUUID().toString())
                .name(name)
                .description(description)
                .bgColor(bgColor)
                .imgUrl(imgUrl)
                .build());
    }

    private void saveItem(String name, CategoryEntity category, String price, String originalPrice,
                          String brand, String sizes, String color, String fabric, int stock,
                          String description, String imgUrl) {
        itemRepository.save(ItemEntity.builder()
                .itemId(UUID.randomUUID().toString())
                .name(name)
                .category(category)
                .price(new BigDecimal(price))
                .originalPrice(new BigDecimal(originalPrice))
                .brand(brand)
                .sizes(sizes)
                .color(color)
                .fabric(fabric)
                .stock(stock)
                .description(description)
                .imgUrl(imgUrl)
                .build());
    }
}
