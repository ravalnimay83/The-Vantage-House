package in.nimay.billingsoftware.controller;

import in.nimay.billingsoftware.entity.ItemEntity;
import in.nimay.billingsoftware.entity.OrderEntity;
import in.nimay.billingsoftware.io.ItemResponse;
import in.nimay.billingsoftware.repository.ItemRepository;
import in.nimay.billingsoftware.repository.OrderEntityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@RestController
@RequestMapping("/ai")
@RequiredArgsConstructor
@CrossOrigin("*")
public class AiController {

    private final ItemRepository itemRepository;
    private final OrderEntityRepository orderEntityRepository;
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient httpClient = HttpClient.newHttpClient();

    @Value("${openai.api.key:}")
    private String openAiApiKey;

    @Value("${gemini.api.key:}")
    private String geminiApiKey;

    private static final List<String> STYLE_QUIPS = List.of(
            "\"Manners maketh man\" — and a crisp fit seals the deal! 🕶️🔥",
            "\"I'm gonna make you an outfit you can't refuse.\" 🎩✨",
            "\"Dress like you're already famous.\" 📸💫",
            "\"Suit up!\" — Barney Stinson would 100% approve! 🧥⚡",
            "\"Looking good isn't self-importance, it's self-respect.\" 😎👌"
    );

    @PostMapping("/chat")
    public Map<String, Object> chat(@RequestBody Map<String, Object> body, Authentication authentication) {
        String rawMessage = body != null && body.get("message") != null
                ? String.valueOf(body.get("message")).trim()
                : "";
        String userName = body != null && body.get("userName") != null
                ? String.valueOf(body.get("userName")).trim()
                : "";

        @SuppressWarnings("unchecked")
        List<Map<String, String>> history = body != null && body.get("history") instanceof List<?> h
                ? (List<Map<String, String>>) h
                : List.of();

        List<ItemEntity> allItems = itemRepository.findAll();

        // 1. Try OpenAI (gpt-4o-mini) or Groq (llama-3.3-70b-versatile) when configured
        if (openAiApiKey != null && !openAiApiKey.isBlank() && !rawMessage.isBlank()) {
            try {
                Map<String, Object> openAiResult = askOpenAiCompatible(rawMessage, userName, history, allItems, authentication);
                if (openAiResult != null) {
                    return openAiResult;
                }
            } catch (Exception ignored) {
                // Fall back to Gemini or local engine
            }
        }

        // 2. Try Gemini 2.5 Flash when GEMINI_API_KEY is configured
        if (geminiApiKey != null && !geminiApiKey.isBlank() && !rawMessage.isBlank()) {
            try {
                Map<String, Object> geminiResult = askGemini(rawMessage, userName, history, allItems, authentication);
                if (geminiResult != null) {
                    return geminiResult;
                }
            } catch (Exception ignored) {
                // Fall back to local concierge engine
            }
        }

        return smartConciergeEngine(rawMessage, userName, allItems, authentication);
    }

    private Map<String, Object> askOpenAiCompatible(
            String userMessage,
            String userName,
            List<Map<String, String>> history,
            List<ItemEntity> allItems,
            Authentication authentication) throws Exception {

        StringBuilder catalogSummary = new StringBuilder();
        for (ItemEntity item : allItems) {
            catalogSummary.append(String.format(
                    "- id=%s | name=%s | price=₹%s | category=%s | color=%s | stock=%s%n",
                    item.getItemId(),
                    item.getName(),
                    item.getPrice(),
                    item.getCategory() != null ? item.getCategory().getName() : "Apparel",
                    item.getColor() != null ? item.getColor() : "Classic",
                    item.getStock() != null ? item.getStock() : 0
            ));
        }

        String orderSummary = "No recent orders or guest user.";
        if (authentication != null && authentication.isAuthenticated()) {
            List<OrderEntity> orders = orderEntityRepository.findByUserEmailOrderByCreatedAtDesc(authentication.getName());
            if (!orders.isEmpty()) {
                OrderEntity o = orders.get(0);
                orderSummary = String.format(
                        "Latest order %s: status=%s, total=₹%s, eta=%s",
                        o.getOrderNumber(), o.getOrderStatus(), o.getGrandTotal(), o.getEstimatedDelivery()
                );
            }
        }

        String systemPrompt = """
                You are Vantage AI, the warm, expressive, intelligent personal stylist & friend for "The Vantage House" (heritage clothing club).
                Talk naturally with plenty of expressive emojis (✨🔥🧥👟😎💬👌) and occasional subtle movie/style quotes.
                IMPORTANT: Do NOT dump product cards on casual chat, greetings, or general questions! Only include `recommendedItemIds` when the customer actually asks for outfit ideas, products, shopping, or recommendations.
                Customer name: %s
                Order context: %s
                Live catalog:
                %s

                Respond ONLY with a valid JSON object:
                {
                  "reply": "Natural, expressive, emoji-rich conversational response.",
                  "actionType": "NONE" | "ADD_TO_CART" | "CLEAR_CART" | "NAVIGATE_BAG" | "NAVIGATE_PROFILE" | "NAVIGATE_SHOP",
                  "addItemId": "exact itemId if actionType is ADD_TO_CART, else null",
                  "size": "S" | "M" | "L" | "XL",
                  "recommendedItemIds": []
                }
                """.formatted(userName.isBlank() ? "Guest" : userName, orderSummary, catalogSummary);

        List<Map<String, String>> messages = new ArrayList<>();
        messages.add(Map.of("role", "system", "content", systemPrompt));
        int start = Math.max(0, history.size() - 6);
        for (int i = start; i < history.size(); i++) {
            Map<String, String> h = history.get(i);
            String role = "user".equals(h.get("role")) ? "user" : "assistant";
            String txt = h.get("text") != null ? h.get("text") : "";
            if (!txt.isBlank()) messages.add(Map.of("role", role, "content", txt));
        }
        messages.add(Map.of("role", "user", "content", userMessage));

        String trimmedKey = openAiApiKey.trim();
        boolean isGroq = trimmedKey.startsWith("gsk_");
        String endpoint = isGroq
                ? "https://api.groq.com/openai/v1/chat/completions"
                : "https://api.openai.com/v1/chat/completions";
        String model = isGroq ? "openai/gpt-oss-120b" : "gpt-4o-mini";

        Map<String, Object> reqBody = Map.of(
                "model", model,
                "messages", messages,
                "temperature", 0.75,
                "response_format", Map.of("type", "json_object")
        );

        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(endpoint))
                .header("Authorization", "Bearer " + trimmedKey)
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(reqBody)))
                .build();

        HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
            return null;
        }

        JsonNode root = objectMapper.readTree(resp.body());
        String rawText = root.path("choices").path(0).path("message").path("content").asText("");
        if (rawText.isBlank()) return null;

        JsonNode aiJson = objectMapper.readTree(rawText.trim());
        return buildStructuredAiResult(aiJson, allItems);
    }

    private Map<String, Object> buildStructuredAiResult(JsonNode aiJson, List<ItemEntity> allItems) {
        String reply = aiJson.path("reply").asText("Got you! ✨");
        String actionType = aiJson.path("actionType").asText("NONE");
        String addItemId = aiJson.path("addItemId").asText("");
        String size = aiJson.path("size").asText("M");

        Map<String, ItemEntity> byId = new HashMap<>();
        for (ItemEntity it : allItems) byId.put(it.getItemId(), it);

        List<ItemResponse> recItems = new ArrayList<>();
        if (aiJson.has("recommendedItemIds") && aiJson.get("recommendedItemIds").isArray()) {
            for (JsonNode idNode : aiJson.get("recommendedItemIds")) {
                ItemEntity found = byId.get(idNode.asText(""));
                if (found != null) recItems.add(toItemResponse(found));
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("reply", reply);
        result.put("items", recItems);

        if ("ADD_TO_CART".equals(actionType) && byId.containsKey(addItemId)) {
            result.put("action", Map.of("type", "ADD_TO_CART", "item", toItemResponse(byId.get(addItemId)), "size", size));
        } else if ("CLEAR_CART".equals(actionType)) {
            result.put("action", Map.of("type", "CLEAR_CART"));
        } else if ("NAVIGATE_BAG".equals(actionType)) {
            result.put("action", Map.of("type", "NAVIGATE", "path", "/explore"));
        } else if ("NAVIGATE_PROFILE".equals(actionType)) {
            result.put("action", Map.of("type", "NAVIGATE", "path", "/profile"));
        } else if ("NAVIGATE_SHOP".equals(actionType)) {
            result.put("action", Map.of("type", "NAVIGATE", "path", "/products"));
        }

        return result;
    }

    private Map<String, Object> askGemini(
            String userMessage,
            String userName,
            List<Map<String, String>> history,
            List<ItemEntity> allItems,
            Authentication authentication) throws Exception {

        StringBuilder catalogSummary = new StringBuilder();
        for (ItemEntity item : allItems) {
            catalogSummary.append(String.format(
                    "- id=%s | name=%s | price=₹%s | category=%s | color=%s | stock=%s%n",
                    item.getItemId(),
                    item.getName(),
                    item.getPrice(),
                    item.getCategory() != null ? item.getCategory().getName() : "Apparel",
                    item.getColor() != null ? item.getColor() : "Classic",
                    item.getStock() != null ? item.getStock() : 0
            ));
        }

        String orderSummary = "No recent orders or guest user.";
        if (authentication != null && authentication.isAuthenticated()) {
            List<OrderEntity> orders = orderEntityRepository.findByUserEmailOrderByCreatedAtDesc(authentication.getName());
            if (!orders.isEmpty()) {
                OrderEntity o = orders.get(0);
                orderSummary = String.format(
                        "Latest order %s: status=%s, total=₹%s, eta=%s",
                        o.getOrderNumber(), o.getOrderStatus(), o.getGrandTotal(), o.getEstimatedDelivery()
                );
            }
        }

        String systemPrompt = """
                You are Vantage AI, the warm, expressive, intelligent personal stylist & friend for "The Vantage House" (heritage clothing club).
                Personality & Tone:
                - Talk naturally just like Gemini: understand context, banter, answer questions thoughtfully, and use plenty of expressive emojis (✨🔥🧥👟😎💬👌)!
                - Sprinkle in fun style wisdom or movie/pop-culture quotes when it fits naturally.
                - IMPORTANT: Do NOT dump product cards on casual chat, greetings, or general questions! Only include `recommendedItemIds` when the customer actually asks for outfit ideas, products, shopping, or recommendations.
                Customer name: %s
                Order context: %s
                Live catalog:
                %s

                Respond ONLY with a valid JSON object (no markdown fences):
                {
                  "reply": "Natural, expressive, emoji-rich conversational response.",
                  "actionType": "NONE" | "ADD_TO_CART" | "CLEAR_CART" | "NAVIGATE_BAG" | "NAVIGATE_PROFILE" | "NAVIGATE_SHOP",
                  "addItemId": "exact itemId if actionType is ADD_TO_CART, else null",
                  "size": "S" | "M" | "L" | "XL",
                  "recommendedItemIds": []
                }
                """.formatted(userName.isBlank() ? "Guest" : userName, orderSummary, catalogSummary);

        List<Map<String, Object>> contents = new ArrayList<>();
        contents.add(Map.of("role", "user", "parts", List.of(Map.of("text", systemPrompt))));
        contents.add(Map.of("role", "model", "parts", List.of(Map.of("text", "{\"reply\":\"Ready! ✨\",\"actionType\":\"NONE\",\"addItemId\":null,\"size\":\"M\",\"recommendedItemIds\":[]}"))));

        int start = Math.max(0, history.size() - 6);
        for (int i = start; i < history.size(); i++) {
            Map<String, String> h = history.get(i);
            String role = "user".equals(h.get("role")) ? "user" : "model";
            String txt = h.get("text") != null ? h.get("text") : "";
            if (!txt.isBlank()) {
                contents.add(Map.of("role", role, "parts", List.of(Map.of("text", txt))));
            }
        }
        contents.add(Map.of("role", "user", "parts", List.of(Map.of("text", userMessage))));

        Map<String, Object> requestBody = Map.of(
                "contents", contents,
                "generationConfig", Map.of(
                        "temperature", 0.75,
                        "responseMimeType", "application/json"
                )
        );

        String trimmedKey = geminiApiKey.trim();
        String endpoint = trimmedKey.startsWith("AQ.")
                ? "https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash:generateContent?key=" + trimmedKey
                : "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + trimmedKey;
        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(endpoint))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(requestBody)))
                .build();

        HttpResponse<String> resp = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
        if (resp.statusCode() < 200 || resp.statusCode() >= 300) {
            return null;
        }

        JsonNode root = objectMapper.readTree(resp.body());
        String rawText = root.path("candidates").path(0).path("content").path("parts").path(0).path("text").asText("");
        if (rawText.isBlank()) return null;

        String cleanedJson = rawText.replaceAll("^```json\\s*", "").replaceAll("```$", "").trim();
        JsonNode aiJson = objectMapper.readTree(cleanedJson);

        String reply = aiJson.path("reply").asText("Got you! ✨");
        String actionType = aiJson.path("actionType").asText("NONE");
        String addItemId = aiJson.path("addItemId").asText("");
        String size = aiJson.path("size").asText("M");

        Map<String, ItemEntity> byId = new HashMap<>();
        for (ItemEntity it : allItems) byId.put(it.getItemId(), it);

        List<ItemResponse> recItems = new ArrayList<>();
        if (aiJson.has("recommendedItemIds") && aiJson.get("recommendedItemIds").isArray()) {
            for (JsonNode idNode : aiJson.get("recommendedItemIds")) {
                ItemEntity found = byId.get(idNode.asText(""));
                if (found != null) recItems.add(toItemResponse(found));
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("reply", reply);
        result.put("items", recItems);

        if ("ADD_TO_CART".equals(actionType) && byId.containsKey(addItemId)) {
            result.put("action", Map.of("type", "ADD_TO_CART", "item", toItemResponse(byId.get(addItemId)), "size", size));
        } else if ("CLEAR_CART".equals(actionType)) {
            result.put("action", Map.of("type", "CLEAR_CART"));
        } else if ("NAVIGATE_BAG".equals(actionType)) {
            result.put("action", Map.of("type", "NAVIGATE", "path", "/explore"));
        } else if ("NAVIGATE_PROFILE".equals(actionType)) {
            result.put("action", Map.of("type", "NAVIGATE", "path", "/profile"));
        } else if ("NAVIGATE_SHOP".equals(actionType)) {
            result.put("action", Map.of("type", "NAVIGATE", "path", "/products"));
        }

        return result;
    }

    private Map<String, Object> smartConciergeEngine(
            String rawMessage,
            String userName,
            List<ItemEntity> allItems,
            Authentication authentication) {

        String lower = rawMessage.toLowerCase(Locale.ENGLISH);
        String first = !userName.isBlank() ? userName.split("\\s+")[0] : "friend";
        String quip = STYLE_QUIPS.get(ThreadLocalRandom.current().nextInt(STYLE_QUIPS.size()));

        // 1. Greetings & Small Talk (NO product dump!)
        if (lower.matches("^(hi|hello|hey|yo|sup|hii|helo|how are you|whats up|what's up|good morning|good evening|good afternoon)[?!.,\\s]*$")) {
            return Map.of(
                    "reply", "Hey " + first + "! 👋✨ " + quip + "\n\nWhat's the mood today? Ask me for outfit ideas 🧥, budget picks 💸, or tell me to add something straight to your bag 🛍️!",
                    "items", List.of()
            );
        }

        // 2. Identity / Capabilities (NO product dump!)
        if (lower.contains("who are you") || lower.contains("what can you do") || lower.contains("help") || lower.contains("how do you work")) {
            return Map.of(
                    "reply", "I'm Vantage AI 🤖✨ — part Harvey Specter 💼, part personal stylist! 🎨\n\nI can:\n• Build outfits for dates, parties, or college 🔥\n• Find pieces by budget (\"under ₹1500\") 💸\n• Add items directly to your bag (\"add tee size L\") 🛍️\n• Track your live orders & open checkout 🚀",
                    "items", List.of()
            );
        }

        // 3. Gratitude / Compliments (NO product dump!)
        if (lower.matches(".*\\b(thank|thanks|thx|awesome|cool|nice|great|love it|perfect|good)\\b.*") && lower.length() < 45) {
            return Map.of(
                    "reply", "Anytime, " + first + "! 🙌✨ Remember: \"Looking good isn't self-importance, it's self-respect.\" 😎🔥 Holler whenever you need another fit or want to check out!",
                    "items", List.of()
            );
        }

        // 4. Track Order
        if (lower.contains("track") || lower.contains("order status") || lower.contains("my order") || lower.contains("where is")) {
            if (authentication != null && authentication.isAuthenticated()) {
                List<OrderEntity> orders = orderEntityRepository.findByUserEmailOrderByCreatedAtDesc(authentication.getName());
                if (!orders.isEmpty()) {
                    OrderEntity latest = orders.get(0);
                    String num = latest.getOrderNumber() != null ? latest.getOrderNumber() : latest.getOrderId();
                    String status = latest.getOrderStatus() != null ? latest.getOrderStatus() : "CONFIRMED";
                    String eta = latest.getEstimatedDelivery() != null ? latest.getEstimatedDelivery() : "soon";
                    return Map.of(
                            "reply", "Got you, " + first + "! 📦✨ Order " + num + " is currently **" + status + "** and arriving by **" + eta + "**. Opening your live tracker now! 🚀",
                            "action", Map.of("type", "NAVIGATE", "path", "/profile"),
                            "items", List.of()
                    );
                }
                return Map.of(
                        "reply", "Looks like you haven't placed an order yet, " + first + "! 👀✨ \"Every legend starts with Day 1\" — want me to suggest a killer first fit? 🔥",
                        "items", List.of()
                );
            }
            return Map.of(
                    "reply", "Sign in first so I can pull up your live order tracker 🔐✨ — taking you to Sign In!",
                    "action", Map.of("type", "NAVIGATE", "path", "/login"),
                    "items", List.of()
            );
        }

        // 5. Clear Bag
        if (lower.contains("clear bag") || lower.contains("clear cart") || lower.contains("empty bag")) {
            return Map.of(
                    "reply", "Clean slate, " + first + "! 🧹✨ Your bag is empty and ready for a fresh drip build. 😎",
                    "action", Map.of("type", "CLEAR_CART"),
                    "items", List.of()
            );
        }

        // 6. Navigation intents
        if (lower.contains("open bag") || lower.contains("my bag") || lower.contains("my cart") || lower.contains("checkout") || lower.contains("pay")) {
            return Map.of(
                    "reply", "Opening your bag now! 🛍️💨 \"Show me the money!\" (or Cash on Delivery, we're cool either way 😉)",
                    "action", Map.of("type", "NAVIGATE", "path", "/explore"),
                    "items", List.of()
            );
        }
        if (lower.contains("open shop") || lower.contains("all drops") || lower.contains("catalog") || lower.contains("browse")) {
            return Map.of(
                    "reply", "Taking you straight to the full Vantage House rack! 🧥✨",
                    "action", Map.of("type", "NAVIGATE", "path", "/products"),
                    "items", List.of()
            );
        }
        if (lower.contains("wishlist") || lower.contains("saved items") || lower.contains("profile") || lower.contains("account")) {
            return Map.of(
                    "reply", "Opening your Vantage House profile & wishlist! ❤️✨",
                    "action", Map.of("type", "NAVIGATE", "path", "/profile"),
                    "items", List.of()
            );
        }

        // 7. Add to Bag intent
        boolean wantsAdd = lower.contains("add ") || lower.contains("put ") || lower.contains("buy ");
        if (wantsAdd) {
            String size = extractSize(lower);
            List<ItemEntity> matches = matchItems(allItems, lower, null);
            if (!matches.isEmpty()) {
                ItemEntity chosen = matches.get(0);
                if (chosen.getStock() != null && chosen.getStock() <= 0) {
                    return Map.of(
                            "reply", "Oof, " + chosen.getName() + " just sold out! 😅🔥 Here are the sharpest pieces still in stock:",
                            "items", toItemResponses(allItems.stream().filter(i -> i.getStock() == null || i.getStock() > 0).limit(3).toList())
                    );
                }
                return Map.of(
                        "reply", "Boom! 💥 Dropped **" + chosen.getName() + "** (Size " + size + ") straight into your bag 🛍️✨. Say \"open bag\" whenever you're ready to roll!",
                        "action", Map.of("type", "ADD_TO_CART", "item", toItemResponse(chosen), "size", size),
                        "items", List.of(toItemResponse(chosen))
                );
            }
        }

        // 8. Check if user is actually asking for products / outfits / budget
        BigDecimal maxPrice = extractMaxPrice(lower);
        boolean shoppingIntent = maxPrice != null ||
                lower.matches(".*\\b(show|suggest|recommend|find|wear|outfit|fit|shirt|tee|t-shirt|pant|trouser|jean|hoodie|jacket|date|dinner|party|winter|summer|college|office|coffee|casual|price|cheap|under|below)\\b.*");

        if (!shoppingIntent) {
            return Map.of(
                    "reply", "I hear you, " + first + "! 😄✨ " + quip + " If you want me to style an outfit 🧥, find pieces under a budget 💸, or add something to your bag 🛍️, just say the word!",
                    "items", List.of()
            );
        }

        List<ItemEntity> matched = matchItems(allItems, lower, maxPrice);
        if (matched.isEmpty()) {
            matched = allItems.stream()
                    .filter(i -> maxPrice == null || (i.getPrice() == null || i.getPrice().compareTo(maxPrice) <= 0))
                    .limit(4)
                    .toList();
        }

        String reply;
        if (lower.contains("date") || lower.contains("dinner") || lower.contains("party")) {
            reply = "\"First impressions are everything.\" 🕯️✨ Pair a crisp tailored shirt with clean trousers — effortless old-money energy! 😎🔥";
        } else if (lower.contains("winter") || lower.contains("cold") || lower.contains("jacket") || lower.contains("hoodie")) {
            reply = "\"Winter is coming\" ❄️🧥 — time to layer up with heavyweight fleece or an outerwear piece that hits hard! 🔥";
        } else if (lower.contains("summer") || lower.contains("hot") || lower.contains("casual") || lower.contains("college") || lower.contains("coffee") || lower.contains("wear") || lower.contains("fit") || lower.contains("outfit")) {
            reply = quip + " Here's a clean rotation you can tap to add right away! 👇✨";
        } else if (maxPrice != null) {
            reply = "Smart spending looks good on you! 💸😎 Top picks under ₹" + maxPrice.intValue() + ":";
        } else {
            reply = "Pulled the cleanest matches from the rack for you! 🧥✨ Tap **Add** or say \"add [item] size L\" 🛍️:";
        }

        return Map.of("reply", reply, "items", toItemResponses(matched.stream().limit(4).toList()));
    }

    private String extractSize(String lower) {
        if (lower.matches(".*\\bsize\\s+xl\\b.*") || lower.matches(".*\\bxl\\b.*")) return "XL";
        if (lower.matches(".*\\bsize\\s+l\\b.*") || lower.matches(".*\\blarge\\b.*")) return "L";
        if (lower.matches(".*\\bsize\\s+s\\b.*") || lower.matches(".*\\bsmall\\b.*")) return "S";
        return "M";
    }

    private BigDecimal extractMaxPrice(String lower) {
        Matcher m = Pattern.compile("(?:under|below|less than|max)\\s*(?:rs\\.?|₹)?\\s*(\\d+)").matcher(lower);
        if (m.find()) {
            return new BigDecimal(m.group(1));
        }
        return null;
    }

    private List<ItemEntity> matchItems(List<ItemEntity> items, String lower, BigDecimal maxPrice) {
        Set<String> stopWords = Set.of("add", "to", "my", "bag", "cart", "put", "in", "show", "me", "find",
                "get", "buy", "some", "a", "an", "the", "for", "under", "below", "wear", "what", "should", "i", "size",
                "suggest", "recommend", "casual", "club", "fit", "outfit", "date", "dinner", "party", "winter", "summer", "college", "office");
        List<String> keywords = Arrays.stream(lower.replaceAll("[^a-z0-9\\s]", " ").split("\\s+"))
                .filter(w -> w.length() >= 2 && !stopWords.contains(w) && !w.matches("\\d+"))
                .toList();

        List<ItemEntity> scored = new ArrayList<>();
        for (ItemEntity item : items) {
            if (maxPrice != null && (item.getPrice() == null || item.getPrice().compareTo(maxPrice) > 0)) {
                continue;
            }
            String hay = (
                    (item.getName() != null ? item.getName() : "") + " " +
                    (item.getCategory() != null && item.getCategory().getName() != null ? item.getCategory().getName() : "") + " " +
                    (item.getColor() != null ? item.getColor() : "") + " " +
                    (item.getDescription() != null ? item.getDescription() : "")
            ).toLowerCase(Locale.ENGLISH);

            boolean matches = keywords.isEmpty() || keywords.stream().anyMatch(kw -> hay.contains(kw));
            if (matches) {
                scored.add(item);
            }
        }
        return scored;
    }

    private List<ItemResponse> toItemResponses(List<ItemEntity> items) {
        return items.stream().map(this::toItemResponse).toList();
    }

    private ItemResponse toItemResponse(ItemEntity item) {
        return ItemResponse.builder()
                .itemId(item.getItemId())
                .name(item.getName())
                .price(item.getPrice())
                .originalPrice(item.getOriginalPrice())
                .description(item.getDescription())
                .brand(item.getBrand())
                .sizes(item.getSizes())
                .color(item.getColor())
                .fabric(item.getFabric())
                .stock(item.getStock())
                .imageUrl(item.getImgUrl())
                .categoryId(item.getCategory() != null ? item.getCategory().getCategoryId() : null)
                .categoryName(item.getCategory() != null ? item.getCategory().getName() : null)
                .build();
    }
}
