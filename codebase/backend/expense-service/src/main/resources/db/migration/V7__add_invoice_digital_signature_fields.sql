-- Migration to add digital signature verification fields to invoices table for auditing
ALTER TABLE invoices ADD COLUMN authorized_signer VARCHAR(100);
ALTER TABLE invoices ADD COLUMN is_digitally_signed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE invoices ADD COLUMN signature_otp VARCHAR(6);
ALTER TABLE invoices ADD COLUMN signed_at TIMESTAMPTZ;
