package com.mom.shopping.controller.dto;

import java.io.Serializable;
import java.util.List;

public record PageResponse<T>(
        int page,
        int size,
        long total,
        List<T> items
) implements Serializable {
}

