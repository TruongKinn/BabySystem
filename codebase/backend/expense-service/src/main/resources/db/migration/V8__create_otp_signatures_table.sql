-- Migration to create otp_signatures table for storing digital signature OTPs temporarily
CREATE TABLE IF NOT EXISTS otp_signatures (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    invoice_no VARCHAR(50) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    expired_at TIMESTAMPTZ NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_signatures_invoice_no ON otp_signatures(invoice_no);
