# Kích hoạt giao diện Web UI thân thiện
ui = true

# Sử dụng công cụ đồng thuận Raft để lưu trữ dữ liệu bền vững và hỗ trợ Cluster
storage "raft" {
  path    = "/vault/data"
  node_id = "mom-vault-node-1"
}

# Cấu hình Listener lắng nghe các yêu cầu kết nối
listener "tcp" {
  address     = "0.0.0.0:8200"
  tls_disable = "true" # TLS được offload tại Load Balancer hoặc API Gateway bên ngoài
}

# Địa chỉ API công khai dùng cho chuyển hướng và quản trị
api_addr = "http://127.0.0.1:8200"

# Địa chỉ giao tiếp Cluster nội bộ cho các Node Raft
cluster_addr = "http://127.0.0.1:8201"

# Bật tính năng khóa bộ nhớ ngăn swap ra ổ đĩa (Yêu cầu IPC_LOCK trong docker-compose)
disable_mlock = false
