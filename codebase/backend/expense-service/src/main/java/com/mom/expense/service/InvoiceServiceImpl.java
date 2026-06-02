package com.mom.expense.service;

import com.mom.common.context.UserContext;
import com.mom.common.exception.ResourceNotFoundException;
import com.mom.expense.controller.dto.CreateInvoiceItemRequest;
import com.mom.expense.controller.dto.CreateInvoiceRequest;
import com.mom.expense.controller.dto.InvoicePageResponse;
import com.mom.expense.controller.dto.InvoiceResponse;
import com.mom.expense.domain.InvoiceEntity;
import com.mom.expense.domain.InvoiceItemEntity;
import com.mom.expense.domain.OtpSignatureEntity;
import com.mom.expense.repository.InvoiceRepository;
import com.mom.expense.repository.OtpSignatureRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.CompletableFuture;

@Service
@RequiredArgsConstructor
@Slf4j
public class InvoiceServiceImpl implements InvoiceService {

    private final InvoiceRepository invoiceRepository;
    private final OtpSignatureRepository otpSignatureRepository;
    private final RestClient.Builder restClientBuilder;

    @Value("${app.notification-service-uri:http://localhost:8098}")
    private String notificationServiceUri;

    @Override
    @Transactional
    public InvoiceResponse createInvoice(CreateInvoiceRequest request) {
        InvoiceEntity invoice = new InvoiceEntity();
        invoice.setFamilyId(request.familyId());
        invoice.setInvoiceNo(request.invoiceNo());
        invoice.setIssueDate(request.issueDate());
        invoice.setDueDate(request.dueDate());
        invoice.setCurrency(request.currency());
        invoice.setSellerName(request.sellerName());
        invoice.setSellerEmail(request.sellerEmail());
        invoice.setSellerPhone(request.sellerPhone());
        invoice.setSellerAddress(request.sellerAddress());
        invoice.setBuyerName(request.buyerName());
        invoice.setBuyerEmail(request.buyerEmail());
        invoice.setBuyerPhone(request.buyerPhone());
        invoice.setBuyerAddress(request.buyerAddress());
        invoice.setDiscountPercent(request.discountPercent());
        invoice.setVatPercent(request.vatPercent());
        invoice.setTotalAmount(request.totalAmount());
        invoice.setNotes(request.notes());
        invoice.setFileMetadataId(request.fileMetadataId());
        invoice.setAuthorizedSigner(request.authorizedSigner());

        boolean isDigitallySigned = request.isDigitallySigned() != null ? request.isDigitallySigned() : false;
        
        if (isDigitallySigned) {
            // Kiểm tra và đối chiếu OTP từ database otp_signatures
            OtpSignatureEntity otpEntity = otpSignatureRepository.findTopByInvoiceNoOrderByCreatedAtDesc(request.invoiceNo())
                    .orElseThrow(() -> new IllegalArgumentException("Mã OTP chưa được xác thực. Vui lòng xác nhận OTP trước khi ký số hóa đơn."));
            
            if (!Boolean.TRUE.equals(otpEntity.getIsVerified())) {
                throw new IllegalArgumentException("Mã OTP chưa được xác thực. Vui lòng xác nhận OTP trước khi ký số hóa đơn.");
            }
            
            // OTP chỉ có hiệu lực ký số trong vòng 10 phút sau khi sinh
            if (otpEntity.getCreatedAt().plusMinutes(10).isBefore(OffsetDateTime.now())) {
                throw new IllegalArgumentException("Yêu cầu xác thực OTP đã hết hiệu lực ký số (10 phút). Vui lòng gửi và xác thực mã OTP mới.");
            }
            
            invoice.setDigitallySigned(true);
            invoice.setSignatureOtp(otpEntity.getOtpCode());
            invoice.setSignedAt(OffsetDateTime.now());
            
            // Xóa bản ghi OTP để chống Replay Attack
            otpSignatureRepository.delete(otpEntity);
        } else {
            invoice.setDigitallySigned(false);
            invoice.setSignatureOtp(null);
            invoice.setSignedAt(null);
        }

        List<InvoiceItemEntity> items = new ArrayList<>();
        for (CreateInvoiceItemRequest itemReq : request.items()) {
            InvoiceItemEntity item = new InvoiceItemEntity();
            item.setInvoice(invoice);
            item.setName(itemReq.name());
            item.setQuantity(itemReq.quantity());
            item.setPrice(itemReq.price());
            item.setTax(itemReq.tax());
            items.add(item);
        }
        invoice.setItems(items);

        InvoiceEntity saved = invoiceRepository.save(invoice);
        return InvoiceResponse.fromEntity(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public InvoiceResponse getInvoice(Long id) {
        InvoiceEntity invoice = invoiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Invoice not found"));
        return InvoiceResponse.fromEntity(invoice);
    }

    @Override
    @Transactional(readOnly = true)
    public InvoicePageResponse getInvoicesPage(Long familyId, String keyword, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<InvoiceEntity> invoicePage;
        
        if (keyword != null && !keyword.trim().isEmpty()) {
            invoicePage = invoiceRepository.findByFamilyIdAndInvoiceNoContainingIgnoreCaseOrderByCreatedAtDesc(
                    familyId,
                    keyword.trim(),
                    pageable
            );
        } else {
            invoicePage = invoiceRepository.findByFamilyIdOrderByCreatedAtDesc(familyId, pageable);
        }

        List<InvoiceResponse> dtoList = invoicePage.getContent().stream()
                .map(InvoiceResponse::fromEntity)
                .toList();

        return new InvoicePageResponse(
                dtoList,
                invoicePage.getTotalElements(),
                invoicePage.getNumber(),
                invoicePage.getSize()
        );
    }

    @Override
    @Transactional
    public void deleteInvoice(Long id) {
        if (!invoiceRepository.existsById(id)) {
            throw new ResourceNotFoundException("Invoice not found");
        }
        invoiceRepository.deleteById(id);
    }

    @Override
    @Transactional
    public void sendSignatureOtp(String invoiceNo) {
        Long userId = UserContext.getUserId();
        if (userId == null) {
            throw new IllegalArgumentException("User not authenticated");
        }

        // Sinh OTP 6 chữ số ngẫu nhiên
        String otpCode = String.format("%06d", new Random().nextInt(1000000));
        
        // Lưu vào DB bảng otp_signatures
        OtpSignatureEntity otpEntity = new OtpSignatureEntity();
        otpEntity.setUserId(userId);
        otpEntity.setInvoiceNo(invoiceNo);
        otpEntity.setOtpCode(otpCode);
        otpEntity.setExpiredAt(OffsetDateTime.now().plusSeconds(60));
        otpEntity.setIsVerified(false);
        otpSignatureRepository.save(otpEntity);

        log.info("Generated OTP {} for invoiceNo={}, user={}", otpCode, invoiceNo, userId);

        // Bắn REST API không đồng bộ gửi Notification chứa OTP thật
        CompletableFuture.runAsync(() -> {
            try {
                Long familyId = null;
                List<Long> familyIds = UserContext.getFamilyIds();
                if (familyIds != null && !familyIds.isEmpty()) {
                    familyId = familyIds.get(0);
                }
                if (familyId == null) {
                    familyId = 0L;
                }

                String title = "MÃ OTP XÁC THỰC KÝ SỐ - FAMILY OS";
                String message = String.format("Mã OTP xác thực ký số cho hóa đơn %s của bạn là: %s. Mã có hiệu lực trong 60 giây.", invoiceNo, otpCode);

                RestClient restClient = restClientBuilder.build();
                Map<String, Object> payload = new HashMap<>();
                payload.put("familyId", familyId);
                payload.put("userId", userId);
                payload.put("channel", "PUSH");
                payload.put("type", "EXPENSE");
                payload.put("title", title);
                payload.put("message", message);

                restClient.post()
                        .uri(notificationServiceUri + "/api/notifications")
                        .header("X-User-Id", String.valueOf(userId))
                        .header("X-Family-Ids", String.valueOf(familyIds != null && !familyIds.isEmpty() ? familyIds.get(0) : 0L))
                        .header("X-User-Admin", String.valueOf(UserContext.isAdmin()))
                        .body(payload)
                        .retrieve()
                        .toBodilessEntity();
                
                log.info("Successfully sent signature OTP notification to userId={} for invoiceNo={}", userId, invoiceNo);
            } catch (Exception ex) {
                log.error("Failed to send OTP notification for invoiceNo={}: {}", invoiceNo, ex.getMessage());
            }
        });
    }

    @Override
    @Transactional
    public void verifySignatureOtp(String invoiceNo, String otpCode) {
        OtpSignatureEntity otpEntity = otpSignatureRepository.findTopByInvoiceNoOrderByCreatedAtDesc(invoiceNo)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy yêu cầu xác thực OTP cho hóa đơn này."));

        if (!otpEntity.getOtpCode().equals(otpCode)) {
            throw new IllegalArgumentException("Mã OTP không chính xác. Vui lòng kiểm tra lại trong chuông thông báo.");
        }

        if (otpEntity.getExpiredAt().isBefore(OffsetDateTime.now())) {
            throw new IllegalArgumentException("Mã OTP đã hết hạn. Vui lòng bấm gửi lại mã.");
        }

        otpEntity.setIsVerified(true);
        otpSignatureRepository.save(otpEntity);
        log.info("OTP verified successfully in DB for invoiceNo={}", invoiceNo);
    }
}
