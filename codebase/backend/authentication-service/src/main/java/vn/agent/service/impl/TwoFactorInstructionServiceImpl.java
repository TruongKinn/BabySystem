package vn.agent.service.impl;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfWriter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import vn.agent.service.TwoFactorInstructionService;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;

@Service
@Slf4j
public class TwoFactorInstructionServiceImpl implements TwoFactorInstructionService {

    @Override
    public ByteArrayInputStream generateInstructionPdf() {
        Document document = new Document(PageSize.A4);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // Font styles
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14);
            Font normalFont = FontFactory.getFont(FontFactory.HELVETICA, 11);

            // Title
            Paragraph title = new Paragraph("HUONG DAN CAI DAT 2FA (TWO-FACTOR AUTHENTICATION)", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(40);
            document.add(title);

            // Intro
            Paragraph intro = new Paragraph(
                    "Chao mung ban den voi AI Agent Workspace. De bao mat tai khoan, vui long lam theo cac buoc sau de kich hoat xac thuc 2 lop.",
                    normalFont);
            intro.setSpacingAfter(20);
            document.add(intro);

            // Step 1
            Paragraph step1Header = new Paragraph("Buoc 1: Tai ung dung Google Authenticator", headerFont);
            step1Header.setSpacingBefore(10);
            document.add(step1Header);
            Paragraph step1Detail = new Paragraph(
                    "- Truy cap App Store (iOS) hoac Google Play Store (Android).\n- Tim kiem tu khoa 'Google Authenticator'.\n- Tai va cai dat ung dung len dien thoai cua ban.",
                    normalFont);
            step1Detail.setSpacingAfter(15);
            document.add(step1Detail);

            // Step 2
            Paragraph step2Header = new Paragraph("Buoc 2: Quet ma QR", headerFont);
            document.add(step2Header);
            Paragraph step2Detail = new Paragraph(
                    "- Mo ung dung Google Authenticator da cai dat.\n- Nhan vao dau (+) o goc duoi ben phai.\n- Chon 'Quet ma QR' (Scan a QR code).\n- Huong camera dien thoai vao ma QR hien thi tren man hinh thiet lap 2FA cua AI Agent.",
                    normalFont);
            step2Detail.setSpacingAfter(15);
            document.add(step2Detail);

            // Step 3
            Paragraph step3Header = new Paragraph("Buoc 3: Nhap ma xac thuc OTP", headerFont);
            document.add(step3Header);
            Paragraph step3Detail = new Paragraph(
                    "- Sau khi quet ma, mot dong ma 6 so se xuat hien trong ung dung (vi du: 123 456).\n- Quay lai man hinh thiet lap 2FA, nhap 6 so nay vao o 'Xac thuc OTP'.\n- Nhan nut 'Kich hoat 2FA'.",
                    normalFont);
            step3Detail.setSpacingAfter(15);
            document.add(step3Detail);

            // Note
            Font redHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, java.awt.Color.RED);
            Paragraph noteHeader = new Paragraph("Luu y quan trong:", redHeaderFont);
            document.add(noteHeader);
            Paragraph noteDetail = new Paragraph(
                    "- Ma bi mat (Secret) rat quan trong, hay sao luu truoc khi hoan tat.\n- Neu ban mat dien thoai, ban se can ma nay de khoi phuc quyen truy cap.",
                    normalFont);
            document.add(noteDetail);

            document.close();
        } catch (DocumentException ex) {
            log.error("Error occurred while generating PDF: {}", ex.getMessage());
        }

        return new ByteArrayInputStream(out.toByteArray());
    }
}
