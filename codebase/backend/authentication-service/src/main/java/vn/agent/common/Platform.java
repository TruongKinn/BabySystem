package vn.agent.common;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonValue;
import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.Arrays;

@Getter
@AllArgsConstructor
public enum Platform {
    @JsonProperty("web")
    WEB("web"),

    @JsonProperty("ios")
    IOS("ios"),

    @JsonProperty("android")
    ANDROID("android"),

    @JsonProperty("miniApp")
    MINI_APP("miniApp");

    private String value;

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator(mode = JsonCreator.Mode.DELEGATING)
    public static Platform fromValue(String value) {
        if (value == null) {
            return null;
        }

        return Arrays.stream(values())
                .filter(item -> item.name().equalsIgnoreCase(value) || item.value.equalsIgnoreCase(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException(
                        "Unsupported platform: " + value + ". Accepted values: web, ios, android, miniApp"));
    }
}
