package com.mom.ai.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.mom.ai.client.dto.OpenAiInputContent;
import com.mom.ai.client.dto.OpenAiInputMessage;
import com.mom.ai.client.dto.OpenAiResponsesRequest;
import com.mom.ai.client.dto.OpenAiResponsesResponse;
import com.mom.ai.client.dto.OpenAiUsage;
import com.mom.ai.config.OpenAiProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatusCode;
import java.util.stream.Collectors;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.time.Duration;

@Component
@RequiredArgsConstructor
@Slf4j
public class GeminiClient {

    private final ObjectMapper objectMapper;
    private final OpenAiProperties properties;

    public OpenAiResponsesResponse create(OpenAiResponsesRequest request) {
        String apiKey = properties.getApiKey();
        if (!StringUtils.hasText(apiKey)) {
            throw new OpenAiConfigurationException("GEMINI/OPENAI_API_KEY is not configured");
        }

        // Map OpenAI/old models to Gemini equivalent if needed (gemini-1.5-flash is not supported for this key/version)
        String geminiModel = properties.getModel();
        if (geminiModel.contains("gpt-") || geminiModel.equals("gpt-5.4-mini") || "gemini-1.5-flash".equals(geminiModel)) {
            geminiModel = "gemini-3.5-flash"; // Map to a stable, supported model in this 2026 environment
        }

        // Build Gemini API URL
        String url = String.format("https://generativelanguage.googleapis.com/v1/models/%s:generateContent?key=%s",
                geminiModel, apiKey);

        // Build Gemini Request Body
        ObjectNode geminiPayload = buildGeminiPayload(request);

        Duration timeout = properties.getTimeout();
        try {
            log.info("Calling Gemini API with model: {}", geminiModel);
            JsonNode responseJson = WebClient.create()
                    .post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(geminiPayload)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, response -> response.bodyToMono(String.class)
                            .defaultIfEmpty("Gemini request failed")
                            .flatMap(body -> Mono.error(new OpenAiApiException(response.statusCode().value(), "Gemini API error: " + body))))
                    .bodyToMono(JsonNode.class)
                    .timeout(timeout)
                    .block();

            return mapGeminiResponse(responseJson, geminiModel);
        } catch (OpenAiApiException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            log.error("Gemini API call failed", ex);
            throw new OpenAiApiException(502, "Gemini API request failed: " + ex.getMessage());
        }
    }

    private ObjectNode buildGeminiPayload(OpenAiResponsesRequest request) {
        ObjectNode root = objectMapper.createObjectNode();

        // 1. Contents (History + User Message)
        // NOTE: Gemini v1 does NOT support top-level "systemInstruction" field.
        // Workaround: prepend the system instructions as the very first user message.
        ArrayNode contentsNode = root.putArray("contents");
        if (StringUtils.hasText(request.instructions())) {
            // Add system prompt as the first user turn, followed by a model acknowledgement
            // This creates a "few-shot" style system prompt that works reliably in v1
            ObjectNode systemTurn = contentsNode.addObject();
            systemTurn.put("role", "user");
            systemTurn.putArray("parts").addObject().put("text",
                    "[System Instructions]\n" + request.instructions());

            ObjectNode systemAck = contentsNode.addObject();
            systemAck.put("role", "model");
            systemAck.putArray("parts").addObject().put("text",
                    "Understood. I will follow these instructions.");
        }

        if (request.input() != null) {
            for (OpenAiInputMessage msg : request.input()) {
                ObjectNode contentItem = contentsNode.addObject();
                
                // Map roles: assistant -> model
                String role = msg.role();
                if ("assistant".equalsIgnoreCase(role)) {
                    role = "model";
                } else if (!"user".equalsIgnoreCase(role)) {
                    role = "user"; // Default to user if any system/other role sneaks in
                }
                
                contentItem.put("role", role);
                ArrayNode partsNode = contentItem.putArray("parts");
                
                String text = "";
                if (msg.content() != null) {
                    text = msg.content().stream()
                            .map(OpenAiInputContent::text)
                            .filter(java.util.Objects::nonNull)
                            .collect(Collectors.joining("\n"));
                }
                partsNode.addObject().put("text", text);
            }
        }

        // 3. Generation Config
        ObjectNode generationConfig = root.putObject("generationConfig");
        if (request.maxOutputTokens() != null) {
            generationConfig.put("maxOutputTokens", request.maxOutputTokens());
        }
        generationConfig.put("temperature", 0.7);

        return root;
    }

    private OpenAiResponsesResponse mapGeminiResponse(JsonNode root, String model) {
        if (root == null || root.isMissingNode() || root.isNull()) {
            throw new OpenAiApiException(502, "Empty response from Gemini API");
        }

        // Extract output text
        String outputText = "";
        JsonNode candidates = root.path("candidates");
        if (candidates.isArray() && candidates.size() > 0) {
            JsonNode firstCandidate = candidates.get(0);
            JsonNode parts = firstCandidate.path("content").path("parts");
            if (parts.isArray() && parts.size() > 0) {
                outputText = parts.get(0).path("text").asText();
            }
        }

        // Extract usage
        OpenAiUsage usage = null;
        JsonNode usageMetadata = root.path("usageMetadata");
        if (!usageMetadata.isMissingNode() && !usageMetadata.isNull()) {
            usage = new OpenAiUsage(
                    usageMetadata.path("promptTokenCount").asInt(0),
                    usageMetadata.path("candidatesTokenCount").asInt(0),
                    usageMetadata.path("totalTokenCount").asInt(0)
            );
        }

        String responseId = "gemini-" + System.currentTimeMillis();
        return new OpenAiResponsesResponse(responseId, model, outputText, usage);
    }

    public String ocrReceipt(String base64Data, String mimeType, String promptText) {
        String apiKey = properties.getApiKey();
        if (!StringUtils.hasText(apiKey)) {
            throw new OpenAiConfigurationException("GEMINI/OPENAI_API_KEY is not configured");
        }

        String geminiModel = properties.getModel();
        if (geminiModel.contains("gpt-") || geminiModel.equals("gpt-5.4-mini") || "gemini-1.5-flash".equals(geminiModel)) {
            geminiModel = "gemini-3.5-flash";
        }

        String url = String.format("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
                geminiModel, apiKey);

        try {
            ObjectNode root = objectMapper.createObjectNode();
            ArrayNode contentsNode = root.putArray("contents");
            ObjectNode turnNode = contentsNode.addObject();
            turnNode.put("role", "user");
            ArrayNode partsNode = turnNode.putArray("parts");
            
            // Text part
            partsNode.addObject().put("text", promptText);
            
            // InlineData part
            ObjectNode inlineDataNode = partsNode.addObject().putObject("inlineData");
            inlineDataNode.put("mimeType", mimeType);
            inlineDataNode.put("data", base64Data);

            // Generation config
            ObjectNode generationConfig = root.putObject("generationConfig");
            generationConfig.put("responseMimeType", "application/json");
            
            // Schema
            ObjectNode schemaNode = generationConfig.putObject("responseSchema");
            schemaNode.put("type", "OBJECT");
            ObjectNode propertiesNode = schemaNode.putObject("properties");
            
            propertiesNode.putObject("amount").put("type", "INTEGER");
            propertiesNode.putObject("date").put("type", "STRING");
            propertiesNode.putObject("category").put("type", "STRING");
            propertiesNode.putObject("note").put("type", "STRING");
            
            ArrayNode requiredNode = schemaNode.putArray("required");
            requiredNode.add("amount");
            requiredNode.add("category");
            requiredNode.add("note");

            Duration timeout = properties.getTimeout();
            log.info("Calling Gemini OCR API with model: {}", geminiModel);
            
            JsonNode responseJson = WebClient.create()
                    .post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(root)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, response -> response.bodyToMono(String.class)
                            .defaultIfEmpty("Gemini OCR request failed")
                            .flatMap(body -> Mono.error(new OpenAiApiException(response.statusCode().value(), "Gemini OCR API error: " + body))))
                    .bodyToMono(JsonNode.class)
                    .timeout(timeout)
                    .block();

            if (responseJson == null) {
                throw new OpenAiApiException(502, "Empty response from Gemini OCR API");
            }

            String outputText = "";
            JsonNode candidates = responseJson.path("candidates");
            if (candidates.isArray() && candidates.size() > 0) {
                JsonNode firstCandidate = candidates.get(0);
                JsonNode parts = firstCandidate.path("content").path("parts");
                if (parts.isArray() && parts.size() > 0) {
                    outputText = parts.get(0).path("text").asText();
                }
            }
            return outputText;
        } catch (OpenAiApiException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            log.error("Gemini OCR API call failed", ex);
            throw new OpenAiApiException(502, "Gemini OCR API request failed: " + ex.getMessage());
        }
    }

    public String ocrVaccinations(String base64Data, String mimeType, String promptText) {
        String apiKey = properties.getApiKey();
        if (!StringUtils.hasText(apiKey)) {
            throw new OpenAiConfigurationException("GEMINI/OPENAI_API_KEY is not configured");
        }

        String geminiModel = properties.getModel();
        if (geminiModel.contains("gpt-") || geminiModel.equals("gpt-5.4-mini") || "gemini-1.5-flash".equals(geminiModel)) {
            geminiModel = "gemini-3.5-flash";
        }

        String url = String.format("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
                geminiModel, apiKey);

        try {
            ObjectNode root = objectMapper.createObjectNode();
            ArrayNode contentsNode = root.putArray("contents");
            ObjectNode turnNode = contentsNode.addObject();
            turnNode.put("role", "user");
            ArrayNode partsNode = turnNode.putArray("parts");
            
            // Text part
            partsNode.addObject().put("text", promptText);
            
            // InlineData part
            ObjectNode inlineDataNode = partsNode.addObject().putObject("inlineData");
            inlineDataNode.put("mimeType", mimeType);
            inlineDataNode.put("data", base64Data);

            // Generation config
            ObjectNode generationConfig = root.putObject("generationConfig");
            generationConfig.put("responseMimeType", "application/json");
            
            // Schema
            ObjectNode schemaNode = generationConfig.putObject("responseSchema");
            schemaNode.put("type", "OBJECT");
            ObjectNode propertiesNode = schemaNode.putObject("properties");
            
            ObjectNode vaccinationsArray = propertiesNode.putObject("vaccinations");
            vaccinationsArray.put("type", "ARRAY");
            
            ObjectNode itemsNode = vaccinationsArray.putObject("items");
            itemsNode.put("type", "OBJECT");
            
            ObjectNode itemProperties = itemsNode.putObject("properties");
            itemProperties.putObject("vaccineName").put("type", "STRING");
            itemProperties.putObject("doseNumber").put("type", "INTEGER");
            itemProperties.putObject("dueDate").put("type", "STRING");
            itemProperties.putObject("notes").put("type", "STRING");
            
            ArrayNode itemRequired = itemsNode.putArray("required");
            itemRequired.add("vaccineName");
            itemRequired.add("doseNumber");
            itemRequired.add("dueDate");

            ArrayNode requiredNode = schemaNode.putArray("required");
            requiredNode.add("vaccinations");

            Duration timeout = properties.getTimeout();
            log.info("Calling Gemini OCR Vaccinations API with model: {}", geminiModel);
            
            JsonNode responseJson = WebClient.create()
                    .post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(root)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, response -> response.bodyToMono(String.class)
                            .defaultIfEmpty("Gemini OCR Vaccinations request failed")
                            .flatMap(body -> Mono.error(new OpenAiApiException(response.statusCode().value(), "Gemini OCR Vaccinations API error: " + body))))
                    .bodyToMono(JsonNode.class)
                    .timeout(timeout)
                    .block();

            if (responseJson == null) {
                throw new OpenAiApiException(502, "Empty response from Gemini OCR Vaccinations API");
            }

            String outputText = "";
            JsonNode candidates = responseJson.path("candidates");
            if (candidates.isArray() && candidates.size() > 0) {
                JsonNode firstCandidate = candidates.get(0);
                JsonNode parts = firstCandidate.path("content").path("parts");
                if (parts.isArray() && parts.size() > 0) {
                    outputText = parts.get(0).path("text").asText();
                }
            }
            return outputText;
        } catch (OpenAiApiException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            log.error("Gemini OCR Vaccinations API call failed", ex);
            throw new OpenAiApiException(502, "Gemini OCR Vaccinations API request failed: " + ex.getMessage());
        }
    }

    public String suggestMeals(String ingredients, String language) {
        String apiKey = properties.getApiKey();
        if (!StringUtils.hasText(apiKey)) {
            throw new OpenAiConfigurationException("GEMINI/OPENAI_API_KEY is not configured");
        }

        String geminiModel = properties.getModel();
        if (geminiModel.contains("gpt-") || geminiModel.equals("gpt-5.4-mini") || "gemini-1.5-flash".equals(geminiModel)) {
            geminiModel = "gemini-3.5-flash";
        }

        String url = String.format("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
                geminiModel, apiKey);

        try {
            ObjectNode root = objectMapper.createObjectNode();
            ArrayNode contentsNode = root.putArray("contents");
            ObjectNode turnNode = contentsNode.addObject();
            turnNode.put("role", "user");
            ArrayNode partsNode = turnNode.putArray("parts");
            
            String promptText = """
                Bạn là chuyên gia dinh dưỡng và đầu bếp AI chuyên nghiệp của hệ thống quản lý gia đình BabySystem.
                Hãy gợi ý các món ăn ngon, lành mạnh và dễ làm từ danh sách nguyên liệu có sẵn mà người dùng cung cấp.
                
                Danh sách nguyên liệu của người dùng:
                %s
                
                Nhiệm vụ của bạn:
                1. Dựa trên nguyên liệu có sẵn (và có thể sử dụng thêm gia vị, hành, tỏi... thông dụng), hãy gợi ý khoảng 5-8 món ăn phù hợp.
                2. Với mỗi món ăn, hãy cung cấp các thông tin sau bằng ngôn ngữ '%s':
                   - Tên món ăn (name) (ví dụ: "Cháo gà hạt sen", "Súp rau củ").
                   - Mô tả ngắn gọn, sinh động và hấp dẫn (description) (ví dụ: "Món ăn ấm bụng, nhiều dinh dưỡng phù hợp cho cả nhà và bé.").
                   - Danh sách chi tiết các nguyên liệu chính cần dùng (ingredients) dưới dạng một mảng các chuỗi.
                   - Phân loại bữa ăn phù hợp nhất (mealType): chỉ chọn một trong các giá trị sau: 'BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'.
                
                Phản hồi bắt buộc phải là đối tượng JSON hợp lệ theo đúng cấu trúc schema yêu cầu.
                """.formatted(ingredients, language);
                
            partsNode.addObject().put("text", promptText);

            // Generation config
            ObjectNode generationConfig = root.putObject("generationConfig");
            generationConfig.put("responseMimeType", "application/json");
            
            // Schema
            ObjectNode schemaNode = generationConfig.putObject("responseSchema");
            schemaNode.put("type", "OBJECT");
            
            ObjectNode propertiesNode = schemaNode.putObject("properties");
            
            ObjectNode dishesNode = propertiesNode.putObject("dishes");
            dishesNode.put("type", "ARRAY");
            
            ObjectNode itemsNode = dishesNode.putObject("items");
            itemsNode.put("type", "OBJECT");
            
            ObjectNode itemProperties = itemsNode.putObject("properties");
            itemProperties.putObject("name").put("type", "STRING");
            itemProperties.putObject("description").put("type", "STRING");
            
            ObjectNode ingredientsArrayNode = itemProperties.putObject("ingredients");
            ingredientsArrayNode.put("type", "ARRAY");
            ingredientsArrayNode.putObject("items").put("type", "STRING");
            
            itemProperties.putObject("mealType").put("type", "STRING");
            
            ArrayNode itemRequired = itemsNode.putArray("required");
            itemRequired.add("name");
            itemRequired.add("description");
            itemRequired.add("ingredients");
            itemRequired.add("mealType");
            
            ArrayNode requiredNode = schemaNode.putArray("required");
            requiredNode.add("dishes");

            Duration timeout = properties.getTimeout();
            log.info("Calling Gemini suggestMeals API with model: {}", geminiModel);
            
            JsonNode responseJson = WebClient.create()
                    .post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(root)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, response -> response.bodyToMono(String.class)
                            .defaultIfEmpty("Gemini suggestMeals request failed")
                            .flatMap(body -> Mono.error(new OpenAiApiException(response.statusCode().value(), "Gemini suggestMeals API error: " + body))))
                    .bodyToMono(JsonNode.class)
                    .timeout(timeout)
                    .block();

            if (responseJson == null) {
                throw new OpenAiApiException(502, "Empty response from Gemini suggestMeals API");
            }

            String outputText = "";
            JsonNode candidates = responseJson.path("candidates");
            if (candidates.isArray() && candidates.size() > 0) {
                JsonNode firstCandidate = candidates.get(0);
                JsonNode parts = firstCandidate.path("content").path("parts");
                if (parts.isArray() && parts.size() > 0) {
                    outputText = parts.get(0).path("text").asText();
                }
            }
            return outputText;
        } catch (OpenAiApiException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            log.error("Gemini suggestMeals API call failed", ex);
            throw new OpenAiApiException(502, "Gemini suggestMeals API request failed: " + ex.getMessage());
        }
    }

    public String generateTravelPlan(String destination, Integer durationDays, String preferences, String language) {
        String apiKey = properties.getApiKey();
        if (!StringUtils.hasText(apiKey)) {
            throw new OpenAiConfigurationException("GEMINI/OPENAI_API_KEY is not configured");
        }

        String geminiModel = properties.getModel();
        if (geminiModel.contains("gpt-") || geminiModel.equals("gpt-5.4-mini") || "gemini-1.5-flash".equals(geminiModel)) {
            geminiModel = "gemini-3.5-flash";
        }

        String url = String.format("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
                geminiModel, apiKey);

        try {
            ObjectNode root = objectMapper.createObjectNode();
            ArrayNode contentsNode = root.putArray("contents");
            ObjectNode turnNode = contentsNode.addObject();
            turnNode.put("role", "user");
            ArrayNode partsNode = turnNode.putArray("parts");

            String preferencesText = StringUtils.hasText(preferences) ? preferences : "Không có yêu cầu đặc biệt.";
            String promptText = """
                Bạn là một chuyên gia du lịch và trợ lý AI của hệ thống quản lý gia đình BabySystem.
                Hãy lập một kế hoạch du lịch hoàn chỉnh cho gia đình dựa trên các thông tin sau:
                - Điểm đến: %s
                - Số ngày đi: %d ngày
                - Yêu cầu đặc biệt/Ngữ cảnh gia đình: %s
                
                Nhiệm vụ của bạn:
                1. Đặt tên tiêu đề chuyến đi (title) hấp dẫn và mô tả ngắn gọn, sinh động (description) chuyến đi. Ghi bằng ngôn ngữ '%s'.
                2. Thiết kế lịch trình cụ thể từng ngày:
                   - Đề xuất các địa điểm tham quan thực tế có thật tại điểm đến đó (ví dụ nếu đi Đà Lạt thì gợi ý Hồ Xuân Hương, Thung lũng Tình Yêu, Chợ Đà Lạt...).
                   - Cung cấp tọa độ địa lý chính xác (lat và lng dạng số thực) của từng điểm đến này để hiển thị trên bản đồ OpenStreetMap.
                   - Phân bổ đều cho các ngày từ 1 đến %d (trường dayIndex từ 1 đến %d).
                   - Viết ghi chú (notes) ngắn gọn, sinh động bằng ngôn ngữ '%s' cho từng địa điểm (các hoạt động nên làm, lý do chọn...).
                3. Đề xuất danh sách các món đồ dùng chuẩn bị (checklist) cụ thể, hữu ích cho chuyến đi (đặc biệt phù hợp nếu có trẻ em đi cùng). Phân loại vào một trong 4 nhóm danh mục chính xác sau:
                   - 'baby' (Đồ dùng cho bé: tã, bỉm, sữa, xe đẩy...)
                   - 'parents' (Đồ dùng của bố mẹ: quần áo dạo phố, đồ tắm...)
                   - 'documents' (Giấy tờ, vé máy bay, vé tàu xe, xác nhận đặt phòng...)
                   - 'other' (Thiết bị khác: sạc dự phòng, máy ảnh, sạc điện thoại...)
                   Mỗi vật dụng có tên ngắn gọn tự nhiên (task) bằng ngôn ngữ '%s'.
                
                Phản hồi bắt buộc phải là đối tượng JSON hợp lệ theo đúng cấu trúc schema yêu cầu.
                """.formatted(destination, durationDays, preferencesText, language, durationDays, durationDays, language, language, language);

            partsNode.addObject().put("text", promptText);

            // Generation config
            ObjectNode generationConfig = root.putObject("generationConfig");
            generationConfig.put("responseMimeType", "application/json");

            // Schema
            ObjectNode schemaNode = generationConfig.putObject("responseSchema");
            schemaNode.put("type", "OBJECT");

            ObjectNode propertiesNode = schemaNode.putObject("properties");

            propertiesNode.putObject("title").put("type", "STRING");
            propertiesNode.putObject("description").put("type", "STRING");

            // Destinations Schema
            ObjectNode destinationsNode = propertiesNode.putObject("destinations");
            destinationsNode.put("type", "ARRAY");
            ObjectNode destItemsNode = destinationsNode.putObject("items");
            destItemsNode.put("type", "OBJECT");
            ObjectNode destProps = destItemsNode.putObject("properties");
            destProps.putObject("name").put("type", "STRING");
            destProps.putObject("lat").put("type", "NUMBER");
            destProps.putObject("lng").put("type", "NUMBER");
            destProps.putObject("dayIndex").put("type", "INTEGER");
            destProps.putObject("notes").put("type", "STRING");

            ArrayNode destRequired = destItemsNode.putArray("required");
            destRequired.add("name");
            destRequired.add("lat");
            destRequired.add("lng");
            destRequired.add("dayIndex");

            // Checklist Schema
            ObjectNode checklistNode = propertiesNode.putObject("checklist");
            checklistNode.put("type", "ARRAY");
            ObjectNode checkItemsNode = checklistNode.putObject("items");
            checkItemsNode.put("type", "OBJECT");
            ObjectNode checkProps = checkItemsNode.putObject("properties");
            checkProps.putObject("task").put("type", "STRING");
            checkProps.putObject("category").put("type", "STRING");

            ArrayNode checkRequired = checkItemsNode.putArray("required");
            checkRequired.add("task");
            checkRequired.add("category");

            ArrayNode requiredNode = schemaNode.putArray("required");
            requiredNode.add("title");
            requiredNode.add("description");
            requiredNode.add("destinations");
            requiredNode.add("checklist");

            Duration timeout = properties.getTimeout();
            log.info("Calling Gemini generateTravelPlan API with model: {}", geminiModel);

            JsonNode responseJson = WebClient.create()
                    .post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(root)
                    .retrieve()
                    .onStatus(HttpStatusCode::isError, response -> response.bodyToMono(String.class)
                            .defaultIfEmpty("Gemini generateTravelPlan request failed")
                            .flatMap(body -> Mono.error(new OpenAiApiException(response.statusCode().value(), "Gemini generateTravelPlan API error: " + body))))
                    .bodyToMono(JsonNode.class)
                    .timeout(timeout)
                    .block();

            if (responseJson == null) {
                throw new OpenAiApiException(502, "Empty response from Gemini generateTravelPlan API");
            }

            String outputText = "";
            JsonNode candidates = responseJson.path("candidates");
            if (candidates.isArray() && candidates.size() > 0) {
                JsonNode firstCandidate = candidates.get(0);
                JsonNode parts = firstCandidate.path("content").path("parts");
                if (parts.isArray() && parts.size() > 0) {
                    outputText = parts.get(0).path("text").asText();
                }
            }
            return outputText;
        } catch (OpenAiApiException ex) {
            throw ex;
        } catch (RuntimeException ex) {
            log.error("Gemini generateTravelPlan API call failed", ex);
            throw new OpenAiApiException(502, "Gemini generateTravelPlan API request failed: " + ex.getMessage());
        }
    }
}

