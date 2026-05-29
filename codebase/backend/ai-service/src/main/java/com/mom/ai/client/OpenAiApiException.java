package com.mom.ai.client;

public class OpenAiApiException extends RuntimeException {

    private final int statusCode;

    public OpenAiApiException(int statusCode, String message) {
        super(message);
        this.statusCode = statusCode;
    }

    public int statusCode() {
        return statusCode;
    }
}
