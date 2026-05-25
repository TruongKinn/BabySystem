package com.mom.baby.controller.dto;

import java.util.List;

public record BatchImportBabiesRequest(
        List<CreateBabyRequest> babies
) {
}
