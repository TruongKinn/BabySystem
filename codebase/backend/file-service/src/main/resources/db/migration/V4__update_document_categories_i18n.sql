-- Cập nhật tên của các danh mục hệ thống mặc định sang định dạng key i18n để hỗ trợ đa ngôn ngữ động
UPDATE document_category SET name = 'app.documents.options.birthCertificate' WHERE name = 'Giấy khai sinh' AND family_id IS NULL;
UPDATE document_category SET name = 'app.documents.options.vaccinationRecord' WHERE name = 'Sổ tiêm chủng' AND family_id IS NULL;
UPDATE document_category SET name = 'app.documents.options.medicalRecord' WHERE name = 'Sổ khám bệnh' AND family_id IS NULL;
UPDATE document_category SET name = 'app.documents.options.insuranceCard' WHERE name = 'Thẻ bảo hiểm' AND family_id IS NULL;
