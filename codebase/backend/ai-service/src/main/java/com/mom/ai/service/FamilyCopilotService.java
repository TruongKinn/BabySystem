package com.mom.ai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mom.ai.client.OpenAiResponsesClient;
import com.mom.ai.client.GeminiClient;
import com.mom.ai.client.dto.OpenAiInputMessage;
import com.mom.ai.client.dto.OpenAiResponsesRequest;
import com.mom.ai.client.dto.OpenAiResponsesResponse;
import com.mom.ai.config.OpenAiProperties;
import com.mom.ai.controller.dto.AiChatMessage;
import com.mom.ai.controller.dto.AiChatRequest;
import com.mom.ai.controller.dto.AiChatResponse;
import com.mom.ai.controller.dto.AiStatusResponse;
import com.mom.ai.controller.dto.OcrReceiptRequest;
import com.mom.ai.controller.dto.OcrReceiptResponse;
import com.mom.ai.controller.dto.OcrVaccinationRequest;
import com.mom.ai.controller.dto.OcrVaccinationResponse;
import com.mom.ai.controller.dto.SuggestMealsRequest;
import com.mom.ai.controller.dto.SuggestMealsResponse;
import com.mom.ai.controller.dto.GenerateTravelPlanRequest;
import com.mom.ai.controller.dto.GenerateTravelPlanResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Slf4j
public class FamilyCopilotService {

    private static final int MAX_HISTORY_MESSAGES = 8;

    private final OpenAiResponsesClient openAiClient;
    private final GeminiClient geminiClient;
    private final OpenAiProperties properties;
    private final SystemPromptFactory promptFactory;
    private final ObjectMapper objectMapper;

    public AiChatResponse chat(AiChatRequest request, UserAccessContext accessContext) {
        enforceFamilyAccess(request.familyId(), accessContext);

        List<OpenAiInputMessage> input = new ArrayList<>();
        if (request.history() != null && !request.history().isEmpty()) {
            request.history().stream()
                    .skip(Math.max(0, request.history().size() - MAX_HISTORY_MESSAGES))
                    .map(this::toOpenAiMessage)
                    .forEach(input::add);
        }
        input.add(OpenAiInputMessage.of("user", buildUserMessage(request)));

        OpenAiResponsesRequest openAiRequest = new OpenAiResponsesRequest(
                properties.getModel(),
                promptFactory.instructions(request.locale()),
                input,
                request.previousResponseId(),
                properties.getMaxOutputTokens()
        );

        OpenAiResponsesResponse response;
        if (isGemini()) {
            response = geminiClient.create(openAiRequest);
        } else {
            response = openAiClient.create(openAiRequest);
        }
        return new AiChatResponse(response.outputText(), response.model(), response.id(), response.usage());
    }

    public AiStatusResponse status() {
        String provider = isGemini() ? "gemini" : "openai";
        return new AiStatusResponse(provider, properties.getModel(), StringUtils.hasText(properties.getApiKey()));
    }

    private boolean isGemini() {
        String apiKey = properties.getApiKey();
        String model = properties.getModel();
        return (apiKey != null && apiKey.startsWith("AIzaSy")) || (model != null && model.toLowerCase().contains("gemini"));
    }

    private OpenAiInputMessage toOpenAiMessage(AiChatMessage message) {
        return OpenAiInputMessage.of(message.role(), message.content());
    }

    private String buildUserMessage(AiChatRequest request) {
        String context = StringUtils.hasText(request.context()) ? request.context().trim() : "No structured family context was provided.";
        return """
                Family ID: %d

                Family context:
                %s

                User question:
                %s
                """.formatted(request.familyId(), context, request.message().trim());
    }

    private void enforceFamilyAccess(Long familyId, UserAccessContext accessContext) {
        if (accessContext == null || accessContext.admin() || !StringUtils.hasText(accessContext.familyIds())) {
            return;
        }

        Set<Long> allowedFamilyIds = Stream.of(accessContext.familyIds().split(","))
                .map(String::trim)
                .filter(StringUtils::hasText)
                .map(Long::valueOf)
                .collect(Collectors.toSet());
        if (!allowedFamilyIds.contains(familyId)) {
            throw new AccessDeniedException("Forbidden by family data isolation policy");
        }
    }

    public OcrReceiptResponse ocrReceipt(OcrReceiptRequest request, UserAccessContext accessContext) {
        enforceFamilyAccess(request.familyId(), accessContext);

        Long fileId = request.fileId();
        String fileServiceUrl = "http://localhost:8092"; 
        
        log.info("Fetching file metadata for fileId: {} from file-service with context", fileId);
        
        // Tạo WebClient với cấu hình buffer size lớn (10MB) để tránh lỗi DataBufferLimitException khi tải file lớn
        WebClient webClient = WebClient.builder()
                .baseUrl(fileServiceUrl)
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(10 * 1024 * 1024))
                .build();
        
        JsonNode fileMetadata;
        try {
            org.springframework.web.reactive.function.client.WebClient.RequestHeadersSpec<?> requestSpec = webClient.get()
                    .uri("/api/files/" + fileId);
            
            if (accessContext.userId() != null) {
                requestSpec = requestSpec.header("X-User-Id", String.valueOf(accessContext.userId()));
            }
            if (StringUtils.hasText(accessContext.familyIds())) {
                requestSpec = requestSpec.header("X-Family-Ids", accessContext.familyIds());
            }
            requestSpec = requestSpec.header("X-User-Admin", String.valueOf(accessContext.admin()));

            fileMetadata = requestSpec.retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();
        } catch (Exception e) {
            log.error("Failed to fetch file metadata for fileId: {}", fileId, e);
            throw new RuntimeException("Không thể lấy thông tin tệp tin từ file-service: " + e.getMessage());
        }

        if (fileMetadata == null || !fileMetadata.path("success").asBoolean()) {
            throw new RuntimeException("Tệp tin không tồn tại hoặc lỗi file-service");
        }

        JsonNode dataNode = fileMetadata.path("data");
        String originalFileName = dataNode.path("originalFileName").asText();
        String contentType = dataNode.path("contentType").asText();

        log.info("Fetching file content for fileId: {} from file-service with context", fileId);
        byte[] fileBytes;
        try {
            org.springframework.web.reactive.function.client.WebClient.RequestHeadersSpec<?> requestSpec = webClient.get()
                    .uri("/api/files/" + fileId + "/view");
            
            if (accessContext.userId() != null) {
                requestSpec = requestSpec.header("X-User-Id", String.valueOf(accessContext.userId()));
            }
            if (StringUtils.hasText(accessContext.familyIds())) {
                requestSpec = requestSpec.header("X-Family-Ids", accessContext.familyIds());
            }
            requestSpec = requestSpec.header("X-User-Admin", String.valueOf(accessContext.admin()));

            fileBytes = requestSpec.retrieve()
                    .bodyToMono(byte[].class)
                    .block();
        } catch (Exception e) {
            log.error("Failed to fetch file content for fileId: {}", fileId, e);
            throw new RuntimeException("Không thể tải nội dung tệp tin từ file-service: " + e.getMessage());
        }

        if (fileBytes == null || fileBytes.length == 0) {
            throw new RuntimeException("Nội dung tệp tin trống hoặc không hợp lệ");
        }

        String base64Data = java.util.Base64.getEncoder().encodeToString(fileBytes);

        String language = StringUtils.hasText(request.language()) ? request.language() : "vi";
        String prompt = """
                Bạn là trợ lý AI phân tích hóa đơn chuyên nghiệp của hệ thống quản lý gia đình BabySystem.
                Hãy đọc và phân tích kỹ hóa đơn/biên lai mua sắm được đính kèm này.
                
                Nhiệm vụ của bạn:
                1. Trích xuất TỔNG SỐ TIỀN thanh toán cuối cùng (amount) dạng số nguyên.
                2. Trích xuất NGÀY giao dịch hoặc ngày in hóa đơn (date) theo định dạng YYYY-MM-DD. Nếu không thấy, hãy sử dụng ngày hiện tại (2026-06-01).
                3. Phân loại danh mục chi tiêu (category) vào MỘT trong các nhóm chính xác sau:
                   - 'Meals' (Bữa ăn, thực phẩm, ăn uống gia đình)
                   - 'Shopping' (Mua sắm vật dụng gia đình)
                   - 'Baby Care' (Sữa, tã, bỉm, đồ chơi, quần áo trẻ em)
                   - 'Utilities' (Tiền điện, nước, internet, điện thoại)
                   - 'Others' (Chi tiêu khác)
                   Hãy phân loại cực kỳ chính xác. Ví dụ: Hóa đơn mua sữa, bỉm tã -> 'Baby Care'. Hóa đơn mua thức ăn siêu thị -> 'Meals'.
                4. Tạo một GHI CHÚ tóm tắt ngắn gọn và tự nhiên (note) về hóa đơn này (Ví dụ: "Hóa đơn mua tã Huggies tại Con Cưng", "Hóa đơn đi chợ WinMart"). Ghi chú bằng ngôn ngữ '%s'.
                5. Trích xuất danh sách các mặt hàng chi tiết (items), mỗi mặt hàng gồm: tên sản phẩm (name), số lượng (quantity), đơn giá hoặc tổng giá mặt hàng (price).
                
                Phản hồi của bạn bắt buộc phải là đối tượng JSON hợp lệ theo đúng cấu trúc schema yêu cầu.
                """.formatted(language);

        log.info("Sending multimodal request to Gemini API for fileId: {}", fileId);
        String ocrResultJson;
        try {
            ocrResultJson = geminiClient.ocrReceipt(base64Data, contentType, prompt);
        } catch (Exception e) {
            log.error("Gemini OCR call failed", e);
            throw new RuntimeException("AI không thể phân tích hóa đơn lúc này: " + e.getMessage());
        }

        log.info("Gemini OCR response: {}", ocrResultJson);

        try {
            JsonNode resultNode = objectMapper.readTree(ocrResultJson);
            long amount = resultNode.path("amount").asLong(0L);
            String date = resultNode.path("date").asText("2026-06-01");
            String category = resultNode.path("category").asText("Others");
            String note = resultNode.path("note").asText("Quét hóa đơn AI");
            double confidenceScore = resultNode.path("confidenceScore").asDouble(0.95);

            List<OcrReceiptResponse.OcrItem> items = new java.util.ArrayList<>();
            JsonNode itemsNode = resultNode.path("items");
            if (itemsNode.isArray()) {
                for (JsonNode item : itemsNode) {
                    items.add(new OcrReceiptResponse.OcrItem(
                            item.path("name").asText("Sản phẩm"),
                            item.path("quantity").asInt(1),
                            item.path("price").asLong(0L)
                    ));
                }
            }

            return new OcrReceiptResponse(amount, date, category, note, items, confidenceScore);
        } catch (Exception e) {
            log.error("Failed to parse OCR JSON response: {}", ocrResultJson, e);
            throw new RuntimeException("Lỗi định dạng kết quả phân tích hóa đơn từ AI: " + e.getMessage());
        }
    }

    public SuggestMealsResponse suggestMeals(SuggestMealsRequest request, UserAccessContext accessContext) {
        enforceFamilyAccess(request.familyId(), accessContext);

        String ingredients = request.ingredients();
        String language = StringUtils.hasText(request.language()) ? request.language() : "vi";

        String jsonResult;
        if (isGemini()) {
            jsonResult = geminiClient.suggestMeals(ingredients, language);
        } else {
            String systemPrompt = "You are a professional chef and nutritionist. Suggest meal options based on ingredients. You must output a JSON object containing a 'dishes' array.";
            String userPrompt = """
                Suggest 5-8 dishes from these ingredients: %s.
                Each dish should have:
                - 'name': Dish name in language '%s'.
                - 'description': Short description in language '%s'.
                - 'ingredients': Array of main ingredients used.
                - 'mealType': Suitable meal type ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK').
                
                You must output only a valid JSON matching this schema:
                {
                  "dishes": [
                    {
                      "name": "string",
                      "description": "string",
                      "ingredients": ["string"],
                      "mealType": "string"
                    }
                  ]
                }
                """.formatted(ingredients, language, language);

            OpenAiResponsesRequest openAiRequest = new OpenAiResponsesRequest(
                    properties.getModel(),
                    systemPrompt,
                    List.of(OpenAiInputMessage.of("user", userPrompt)),
                    null,
                    properties.getMaxOutputTokens()
            );

            OpenAiResponsesResponse response = openAiClient.create(openAiRequest);
            jsonResult = response.outputText();
        }

        log.info("AI suggested meals response: {}", jsonResult);

        try {
            JsonNode resultNode = objectMapper.readTree(jsonResult);
            List<SuggestMealsResponse.SuggestedDish> dishes = new ArrayList<>();
            JsonNode dishesNode = resultNode.path("dishes");
            if (dishesNode.isArray()) {
                for (JsonNode dish : dishesNode) {
                    List<String> dishIngredients = new ArrayList<>();
                    JsonNode ingNode = dish.path("ingredients");
                    if (ingNode.isArray()) {
                        for (JsonNode ing : ingNode) {
                            dishIngredients.add(ing.asText());
                        }
                    }
                    dishes.add(new SuggestMealsResponse.SuggestedDish(
                            dish.path("name").asText("Món ăn ngon"),
                            dish.path("description").asText("Gợi ý từ AI"),
                            dishIngredients,
                            dish.path("mealType").asText("DINNER").toUpperCase()
                    ));
                }
            }
            return new SuggestMealsResponse(dishes);
        } catch (Exception e) {
            log.error("Failed to parse suggest meals JSON response: {}", jsonResult, e);
            throw new RuntimeException("Lỗi định dạng kết quả gợi ý món ăn từ AI: " + e.getMessage());
        }
    }

    public GenerateTravelPlanResponse generateTravelPlan(GenerateTravelPlanRequest request, UserAccessContext accessContext) {
        enforceFamilyAccess(request.familyId(), accessContext);

        String destination = request.destination();
        int durationDays = request.durationDays();
        String preferences = request.preferences();
        String language = StringUtils.hasText(request.language()) ? request.language() : "vi";

        String jsonResult;
        if (isGemini()) {
            jsonResult = geminiClient.generateTravelPlan(destination, durationDays, preferences, language);
        } else {
            // Fallback to OpenAI if not gemini
            String systemPrompt = "You are a professional travel planner assistant. Generate a travel plan matching the requested schema in JSON format.";
            String userPrompt = """
                Generate a travel plan for:
                - Destination: %s
                - Duration: %d days
                - Preferences: %s
                
                You must output only a valid JSON matching this schema:
                {
                  "title": "string",
                  "description": "string",
                  "destinations": [
                    {
                      "name": "string",
                      "lat": 0.0,
                      "lng": 0.0,
                      "dayIndex": 1,
                      "notes": "string"
                    }
                  ],
                  "checklist": [
                    {
                      "task": "string",
                      "category": "string"
                    }
                  ]
                }
                """.formatted(destination, durationDays, preferences, language);

            OpenAiResponsesRequest openAiRequest = new OpenAiResponsesRequest(
                    properties.getModel(),
                    systemPrompt,
                    List.of(OpenAiInputMessage.of("user", userPrompt)),
                    null,
                    properties.getMaxOutputTokens()
            );

            OpenAiResponsesResponse response = openAiClient.create(openAiRequest);
            jsonResult = response.outputText();
        }

        log.info("AI suggested travel plan response: {}", jsonResult);

        try {
            return objectMapper.readValue(jsonResult, GenerateTravelPlanResponse.class);
        } catch (Exception e) {
            log.error("Failed to parse generate travel plan JSON response: {}", jsonResult, e);
            throw new RuntimeException("Lỗi định dạng kết quả tạo chuyến đi từ AI: " + e.getMessage());
        }
    }

    public OcrVaccinationResponse ocrVaccinations(OcrVaccinationRequest request, UserAccessContext accessContext) {
        enforceFamilyAccess(request.familyId(), accessContext);

        Long fileId = request.fileId();
        String fileServiceUrl = "http://localhost:8092"; 
        
        log.info("Fetching file metadata for fileId: {} from file-service for vaccination OCR", fileId);
        
        WebClient webClient = WebClient.builder()
                .baseUrl(fileServiceUrl)
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(10 * 1024 * 1024))
                .build();
        
        JsonNode fileMetadata;
        try {
            org.springframework.web.reactive.function.client.WebClient.RequestHeadersSpec<?> requestSpec = webClient.get()
                    .uri("/api/files/" + fileId);
            
            if (accessContext.userId() != null) {
                requestSpec = requestSpec.header("X-User-Id", String.valueOf(accessContext.userId()));
            }
            if (StringUtils.hasText(accessContext.familyIds())) {
                requestSpec = requestSpec.header("X-Family-Ids", accessContext.familyIds());
            }
            requestSpec = requestSpec.header("X-User-Admin", String.valueOf(accessContext.admin()));

            fileMetadata = requestSpec.retrieve()
                    .bodyToMono(JsonNode.class)
                    .block();
        } catch (Exception e) {
            log.error("Failed to fetch file metadata for fileId: {}", fileId, e);
            throw new RuntimeException("Không thể lấy thông tin tệp tin từ file-service: " + e.getMessage());
        }

        if (fileMetadata == null || !fileMetadata.path("success").asBoolean()) {
            throw new RuntimeException("Tệp tin không tồn tại hoặc lỗi file-service");
        }

        JsonNode dataNode = fileMetadata.path("data");
        String contentType = dataNode.path("contentType").asText();

        log.info("Fetching file content for fileId: {} for vaccination OCR", fileId);
        byte[] fileBytes;
        try {
            org.springframework.web.reactive.function.client.WebClient.RequestHeadersSpec<?> requestSpec = webClient.get()
                    .uri("/api/files/" + fileId + "/view");
            
            if (accessContext.userId() != null) {
                requestSpec = requestSpec.header("X-User-Id", String.valueOf(accessContext.userId()));
            }
            if (StringUtils.hasText(accessContext.familyIds())) {
                requestSpec = requestSpec.header("X-Family-Ids", accessContext.familyIds());
            }
            requestSpec = requestSpec.header("X-User-Admin", String.valueOf(accessContext.admin()));

            fileBytes = requestSpec.retrieve()
                    .bodyToMono(byte[].class)
                    .block();
        } catch (Exception e) {
            log.error("Failed to fetch file content for fileId: {}", fileId, e);
            throw new RuntimeException("Không thể tải nội dung tệp tin từ file-service: " + e.getMessage());
        }

        if (fileBytes == null || fileBytes.length == 0) {
            throw new RuntimeException("Nội dung tệp tin trống hoặc không hợp lệ");
        }

        String base64Data = java.util.Base64.getEncoder().encodeToString(fileBytes);

        String prompt = """
                Bạn là trợ lý AI chuyên nghiệp phân tích Sổ tiêm chủng của hệ thống quản lý gia đình BabySystem.
                Hãy đọc và phân tích kỹ ảnh chụp Sổ tiêm chủng y tế được đính kèm này.
                
                Nhiệm vụ của bạn:
                1. Đọc và trích xuất danh sách tất cả các mũi vắc-xin đã tiêm hoặc được hẹn tiêm hiển thị trên sổ.
                2. Với mỗi mũi tiêm, hãy trích xuất:
                   - vaccineName: Tên vắc-xin (ví dụ: "Lao BCG", "6-trong-1 Hexaxim", "Phế cầu Synflorix").
                   - doseNumber: Mũi tiêm số mấy (Mũi 1, Mũi 2, Mũi 3...). Trả về kiểu số nguyên (ví dụ: 1, 2, 3). Nếu không rõ thì mặc định trả về 1.
                   - dueDate: Ngày tiêm hoặc ngày hẹn tiêm hiển thị trong ảnh (định dạng YYYY-MM-DD). Nếu không thấy rõ ngày, hãy nội suy hoặc bỏ qua.
                   - notes: Các ghi chú đi kèm (ví dụ: Phản ứng sốt nhẹ, cơ sở tiêm...).
                3. Trả về đúng định dạng JSON theo schema đã chỉ định.
                """;

        String jsonResult = geminiClient.ocrVaccinations(base64Data, contentType, prompt);
        log.info("AI suggested vaccination OCR response: {}", jsonResult);

        try {
            return objectMapper.readValue(jsonResult, OcrVaccinationResponse.class);
        } catch (Exception e) {
            log.error("Failed to parse OCR vaccinations JSON response: {}", jsonResult, e);
            throw new RuntimeException("Lỗi định dạng kết quả nhận diện sổ tiêm chủng từ AI: " + e.getMessage());
        }
    }
}
