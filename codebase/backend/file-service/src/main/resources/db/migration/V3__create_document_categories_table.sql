CREATE TABLE document_category (
    id BIGSERIAL PRIMARY KEY,
    family_id BIGINT,
    name VARCHAR(255) NOT NULL,
    icon VARCHAR(100),
    color VARCHAR(100),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

-- Tạo chỉ mục để tối ưu hóa truy vấn theo gia đình
CREATE INDEX idx_doc_cat_family_id ON document_category(family_id);

-- Chèn dữ liệu mẫu Master Data hệ thống ban đầu (dùng chung cho các gia đình)
INSERT INTO document_category (family_id, name, icon, color) VALUES
(NULL, 'Giấy khai sinh', 'file-text', '#3b82f6'),
(NULL, 'Sổ tiêm chủng', 'safety-certificate', '#10b981'),
(NULL, 'Sổ khám bệnh', 'heart', '#ef4444'),
(NULL, 'Thẻ bảo hiểm', 'property-safety', '#8b5cf6');
