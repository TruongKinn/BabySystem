# Tài liệu: Tính năng Tỷ Giá Tự Động (Currency Exchange – Premium)

**Service:** `expense-service`  
**Feature Key:** `currency_exchange`  
**Loại:** Premium Feature

---

## Tổng quan

Tính năng cho phép user **xem tỷ giá ngoại tệ theo thời gian thực** từ Vietcombank và **chuyển đổi chi phí ngoại tệ sang VND** trực tiếp trong ứng dụng. Chỉ dành cho gia đình có entitlement `currency_exchange` (ALLOW).

---

## API Endpoints

### 1. Lấy danh sách tỷ giá

```
GET /expense/exchange-rates?familyId={familyId}
```

**Headers:** `X-User-Id`, `X-Family-Ids`, `X-User-Admin` (forwarded từ API Gateway)


**Response:**
```json
{
  "success": true,
  "message": "Success",
  "data": [
    {
      "currency": "USD",
      "buyRate": 25350.00,
      "sellRate": 25680.00,
      "updatedAt": "2026-05-22T08:00:00Z"
    },
    {
      "currency": "EUR",
      "buyRate": 27500.00,
      "sellRate": 27900.00,
      "updatedAt": "2026-05-22T08:00:00Z"
    }
  ]
}
```

**Lỗi:**
- `403` – `PREMIUM_REQUIRED:currency_exchange` (không có premium)
- `502` – Không kết nối được Vietcombank

---

### 2. Chuyển đổi ngoại tệ sang VND

```
POST /expense/exchange-rates/convert
```

**Request Body:**

```json
{
  "familyId": 1,
  "fromCurrency": "USD",
  "amount": 100.00
}
```

**Response:**
```json
{
  "success": true,
  "message": "Conversion successful",
  "data": {
    "fromCurrency": "USD",
    "originalAmount": 100.00,
    "amountVnd": 2568000,
    "sellRate": 25680.00,
    "rateUpdatedAt": "2026-05-22T08:00:00Z"
  }
}
```

**Lỗi:**
- `403` – `PREMIUM_REQUIRED:currency_exchange`
- `400` – Currency không tồn tại trong danh sách Vietcombank
- `502` – Không kết nối được Vietcombank

> **Ghi chú:** VND → VND luôn trả về rate = 1 (không cần call Vietcombank).

---

## Kiến trúc

```
ExchangeRateController
    ├── GET /api/exchange-rates
    └── POST /api/exchange-rates/convert
            │
            └── ExchangeRateService
                    ├── PremiumCheckClient  → account-service /api/families/{id}/features/resolved
                    ├── VietcombankRateFetcher → https://www.vietcombank.com.vn/ExchangeRate/ExchangerateXML.aspx
                    └── Redis Cache "exchange-rates" (TTL: 4 giờ)

ExchangeRateScheduler
    └── @Scheduled (cron: 0 0 1,5,9 * * *) → 8h, 12h, 16h ICT
            └── ExchangeRateService.fetchAndRefresh()
```

---

## Files thay đổi

### expense-service (mới)
| File | Mô tả |
|------|-------|
| `exchangerate/ExchangeRateController.java` | REST Controller |
| `exchangerate/ExchangeRateService.java` | Business logic + cache |
| `exchangerate/VietcombankRateFetcher.java` | Fetch & parse XML từ Vietcombank |
| `exchangerate/PremiumCheckClient.java` | HTTP client gọi account-service |
| `exchangerate/ExchangeRateScheduler.java` | Scheduled refresh |
| `exchangerate/ExchangeRateFetchException.java` | Custom exception |
| `config/ExpenseAppConfig.java` | Bean configuration |
| `controller/dto/ExchangeRateResponse.java` | DTO tỷ giá |
| `controller/dto/ConvertCurrencyRequest.java` | DTO request convert |
| `controller/dto/ConvertCurrencyResponse.java` | DTO response convert |

### expense-service (sửa đổi)
| File | Thay đổi |
|------|----------|
| `controller/RestExceptionHandler.java` | Thêm handler `ExchangeRateFetchException` → 502 |
| `resources/application.yml` | Thêm `account-service.url`, `exchange-rate.scheduler.cron`, cache config |

### account-service (mới)
| File | Thay đổi |
|------|----------|
| `db/migration/V10__add_currency_exchange_premium_feature.sql` | Insert feature `currency_exchange` vào `premium_features` |

### authentication-service (mới)
| File | Thay đổi |
|------|----------|
| `db/migration/V29__currency_exchange_rate_permissions.sql` | Khai báo 2 API permission và gán cho các role (đường dẫn `/expense/api/...`) |
| `db/migration/V30__fix_exchange_rate_permission_paths.sql` | Sửa lại đường dẫn thành gateway path dạng `/expense/...` và gán phân quyền cho category report |


---

## Cấu hình môi trường

| Biến môi trường | Mặc định | Mô tả |
|----------------|----------|-------|
| `ACCOUNT_SERVICE_URL` | `http://localhost:8082` | URL nội bộ account-service |
| `EXCHANGE_RATE_CRON` | `0 0 1,5,9 * * *` | Cron refresh tỷ giá (UTC) = 8h, 12h, 16h ICT |


---

## Premium Setup

Để kích hoạt tính năng cho một gia đình:
1. Admin truy cập `PUT /account/api/admin/families/{id}/entitlements`
2. Body:
```json
{
  "entitlements": [
    {
      "featureKey": "currency_exchange",
      "status": "ALLOW",
      "expiresAt": null,
      "reason": "Activated by admin"
    }
  ]
}
```

---

## Nguồn tỷ giá

- **URL:** `https://www.vietcombank.com.vn/ExchangeRate/ExchangerateXML.aspx`
- **Format:** XML, public (không cần API key)
- **Tỷ giá áp dụng:** Giá bán (Sell rate) cho chuyển đổi sang VND
- **Cache TTL:** 4 giờ trong Redis
- **Auto-refresh:** 3 lần/ngày vào 8h, 12h, 16h giờ Việt Nam
