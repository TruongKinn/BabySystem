# API Contracts: Baby Vaccination Tracker

**Feature**: Baby Vaccination Tracker
**Date**: 2026-07-26
**Status**: Completed

Tất cả các API được bảo mật bằng Keycloak JWT. Các API dành cho User (Bố/Mẹ) bắt buộc phải truyền kèm thông tin Family ID hoặc hệ thống sẽ tự động đối chiếu JWT token với Family ID của em bé thông qua `DataIsolationUtil` nhằm đảm bảo an toàn thông tin (cô lập dữ liệu).

---

## 1. API dành cho Admin (Quản trị danh mục & Lộ trình)

### 1.1 Tạo mới Vắc-xin
*   **Endpoint**: `POST /api/vaccines`
*   **Quyền hạn**: `ROLE_ADMIN` (Yêu cầu API Permission Gate)
*   **Request Body**:
```json
{
  "name": "Infanrix Hexa 6-in-1",
  "manufacturer": "GSK (Bỉ)",
  "diseasePrevented": "Bạch hầu, Ho gà, Uốn ván, Bại liệt, Viêm gan B, Hib",
  "totalDoses": 3,
  "description": "Vắc-xin kết hợp phòng 6 bệnh truyền nhiễm nguy hiểm cho trẻ em từ 2 tháng tuổi."
}
```
*   **Response (201 Created)**:
```json
{
  "code": 201,
  "message": "Vaccine created successfully",
  "data": {
    "id": 12,
    "name": "Infanrix Hexa 6-in-1",
    "manufacturer": "GSK (Bỉ)",
    "diseasePrevented": "Bạch hầu, Ho gà, Uốn ván, Bại liệt, Viêm gan B, Hib",
    "totalDoses": 3,
    "description": "Vắc-xin kết hợp phòng 6 bệnh truyền nhiễm nguy hiểm cho trẻ em từ 2 tháng tuổi.",
    "isActive": true,
    "createdAt": "2026-07-26T15:00:00+07:00"
  }
}
```

### 1.2 Tạo cấu hình Lộ trình tiêm chủng
*   **Endpoint**: `POST /api/vaccines/{vaccineId}/schedule-configs`
*   **Quyền hạn**: `ROLE_ADMIN`
*   **Request Body**:
```json
{
  "doseNumber": 1,
  "recommendedAgeMonths": 2,
  "minDaysSincePreviousDose": 0
}
```
*   **Response (201 Created)**:
```json
{
  "code": 201,
  "message": "Schedule config created successfully",
  "data": {
    "id": 45,
    "vaccineId": 12,
    "doseNumber": 1,
    "recommendedAgeMonths": 2,
    "minDaysSincePreviousDose": 0,
    "createdAt": "2026-07-26T15:05:00+07:00"
  }
}
```

---

## 2. API dành cho User (Bố/Mẹ - Quản lý tiêm chủng của con)

### 2.1 Lấy danh sách lộ trình & lịch sử tiêm của em bé
*   **Endpoint**: `GET /api/babies/{babyId}/vaccinations`
*   **Quyền hạn**: Quyền truy cập thuộc nhóm gia đình chứa `babyId` (`DataIsolationUtil.validateFamilyAccess`).
*   **Response (200 OK)**:
```json
{
  "code": 200,
  "message": "Success",
  "data": [
    {
      "id": 301,
      "babyId": 5,
      "vaccine": {
        "id": 12,
        "name": "Infanrix Hexa 6-in-1",
        "diseasePrevented": "Bạch hầu, Ho gà, Uốn ván, Bại liệt, Viêm gan B, Hib"
      },
      "doseNumber": 1,
      "dueDate": "2026-08-15",
      "completed": true,
      "completedAt": "2026-08-14T09:30:00+07:00",
      "facility": "Trung tâm tiêm chủng VNVC",
      "postReaction": "Sốt nhẹ 38 độ trong 1 ngày",
      "notes": "Bé tiêm ngoan",
      "status": "COMPLETED"
    },
    {
      "id": 302,
      "babyId": 5,
      "vaccine": {
        "id": 12,
        "name": "Infanrix Hexa 6-in-1",
        "diseasePrevented": "Bạch hầu, Ho gà, Uốn ván, Bại liệt, Viêm gan B, Hib"
      },
      "doseNumber": 2,
      "dueDate": "2026-09-11",
      "completed": false,
      "completedAt": null,
      "facility": null,
      "postReaction": null,
      "notes": null,
      "status": "PENDING"
    }
  ]
}
```

### 2.2 Xác nhận tiêm hoàn thành một mũi
*   **Endpoint**: `POST /api/babies/{babyId}/vaccinations/{vaccinationId}/complete`
*   **Quyền hạn**: Quyền truy cập nhóm gia đình.
*   **Request Body**:
```json
{
  "actualDate": "2026-08-14",
  "facility": "Trung tâm tiêm chủng VNVC",
  "postReaction": "Sốt nhẹ 38 độ",
  "notes": "Đã hoàn thành tiêm đúng lịch"
}
```
*   **Response (200 OK)**:
```json
{
  "code": 200,
  "message": "Vaccination record updated to completed",
  "data": {
    "id": 301,
    "status": "COMPLETED",
    "completed": true,
    "completedAt": "2026-08-14T15:35:00+07:00"
  }
}
```
*   *Lưu ý: Gọi API này thành công sẽ tự động cập nhật `due_date` cho mũi tiêm tiếp theo (nếu có) trong DB.*

### 2.3 Hoãn lịch tiêm chủng (Dời lịch hẹn)
*   **Endpoint**: `POST /api/babies/{babyId}/vaccinations/{vaccinationId}/postpone`
*   **Quyền hạn**: Quyền truy cập nhóm gia đình.
*   **Request Body**:
```json
{
  "newDueDate": "2026-08-25",
  "reason": "Bé đang bị sốt mọc răng, bác sĩ chỉ định hoãn tiêm 10 ngày"
}
```
*   **Response (200 OK)**:
```json
{
  "code": 200,
  "message": "Vaccination postponed successfully",
  "data": {
    "id": 301,
    "status": "POSTPONED",
    "dueDate": "2026-08-25",
    "notes": "Hoãn tiêm: Bé đang bị sốt mọc răng, bác sĩ chỉ định hoãn tiêm 10 ngày"
  }
}
```

### 2.4 Tải lên ảnh chụp sổ tiêm (AI OCR trích xuất xem trước)
*   **Endpoint**: `POST /api/babies/{babyId}/vaccinations/scan`
*   **Quyền hạn**: Quyền truy cập nhóm gia đình.
*   **Content-Type**: `multipart/form-data`
*   **Request Body**:
    *   `file`: Tệp hình ảnh sổ tiêm chủng (PNG/JPG).
*   **Response (200 OK)**:
```json
{
  "code": 200,
  "message": "OCR extract completed",
  "data": {
    "confidenceScore": 0.91,
    "scannedItems": [
      {
        "vaccineName": "Lao (BCG)",
        "doseNumber": 1,
        "actualDate": "2026-06-01",
        "facility": "Bệnh viện Phụ sản"
      },
      {
        "vaccineName": "Viêm gan B (Mũi sơ sinh)",
        "doseNumber": 1,
        "actualDate": "2026-06-01",
        "facility": "Bệnh viện Phụ sản"
      }
    ]
  }
}
```
*   *Lưu ý: API này không ghi trực tiếp vào DB, chỉ phục vụ xem trước. Người dùng sẽ chỉnh sửa và ấn "Lưu tất cả" thì Frontend mới gọi API complete tương ứng để ghi dữ liệu.*
