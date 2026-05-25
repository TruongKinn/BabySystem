package com.mom.file.controller.dto;

public record DocumentParseResponse(
        String filename,
        int pageCount,
        long sizeKb,
        String textPreview,
        String author
) {}
