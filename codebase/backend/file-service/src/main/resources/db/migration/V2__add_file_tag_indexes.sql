create index if not exists idx_file_metadata_family_bucket_tag_not_deleted
    on file_metadata(family_id, bucket_name, file_tag, is_deleted, created_at desc);

create index if not exists idx_file_metadata_family_tag_not_deleted
    on file_metadata(family_id, file_tag, is_deleted, created_at desc);
