package com.mom.file.controller.dto;

import java.util.List;

public record BatchImportBabiesRequest(
        List<CreateBabyImportItem> babies
) {}
