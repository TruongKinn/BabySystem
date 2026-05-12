package vn.agent.service;

import java.io.ByteArrayInputStream;

public interface TwoFactorInstructionService {
    ByteArrayInputStream generateInstructionPdf();
}
