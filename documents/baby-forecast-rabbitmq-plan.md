# Ke hoach trien khai Baby Forecast Engine voi RabbitMQ

## 1. Muc tieu

Tao mot tinh nang moi cho user: **Baby Forecast Engine**.

Tinh nang nay du bao nhip sinh hoat 12-24 gio toi cua be dua tren log an, ngu, thay ta, suc khoe, tang truong va lich tiem. Ket qua hien thi cho user nhu:

- Khung gio be co kha nang buon ngu tiep theo.
- Nguy co lech nhip trong ngay, vi du ngu it hon trung binh hoac an thua bua.
- Goi y dieu chinh nhe cho phu huynh.
- Canh bao khi du lieu gan day vuot nguong bat thuong.

Khong tao service moi. RabbitMQ duoc them nhu mot message broker moi, nhung producer va consumer deu nam trong cac service hien co.

## 2. Service su dung

### baby-service

Day la service chinh cua tinh nang.

Them cac module noi bo:

- `forecast.domain`: luu forecast, anomaly, recommendation.
- `forecast.repository`: repository doc ghi forecast.
- `forecast.service`: tinh forecast, tinh anomaly, tao recommendation rule-based.
- `forecast.rabbit`: publish va consume RabbitMQ message.
- `forecast.controller`: API doc ket qua forecast cho frontend.

`BabyService.createLog()` hien da luu `baby_logs` va publish Kafka `baby.log.created`. Sau khi luu log thanh cong, bo sung publish RabbitMQ event `baby.activity.recorded` de kich hoat pipeline forecast.

### ai-service

Khong bat buoc cho MVP.

Sau MVP, `baby-service` co the goi REST sang `ai-service` de bien ket qua rule-based thanh noi dung tu van de doc hon. Luu y noi dung phai co disclaimer y te va khong chan luong forecast neu AI loi.

### notification-service

Khong tao consumer RabbitMQ o giai doan dau.

`baby-service` sau khi phat hien anomaly se publish event Kafka `notification.requested` hoac goi endpoint notification hien co, de `notification-service` luu notification va day WebSocket cho user.

### frontend

Them view trong module Baby hien co, khong tao app rieng:

- Tab hoac section `Forecast`.
- Hien thi forecast cards, risk badges, next action, timeline 24h.
- Cho phep user refresh forecast hoac xem ly do he thong dua ra goi y.

## 3. Cong nghe de xuat

- **RabbitMQ**: xu ly pipeline forecast bat dong bo va retry.
- **Spring AMQP**: tich hop RabbitMQ trong `baby-service`.
- **PostgreSQL**: luu forecast snapshot va anomaly.
- **Redis cache**: cache forecast moi nhat theo `babyId`.
- **Kafka hien co**: tiep tuc dung cho event lien service nhu notification va insight.
- **OpenTelemetry + Grafana**: theo doi queue depth, latency, failed messages.
- **Optional AI**: goi `ai-service` de sinh loi giai thich than thien.

Ly do dung ca RabbitMQ va Kafka:

- Kafka hien dang la event bus lien service.
- RabbitMQ phu hop hon cho job/task pipeline co retry, delay, dead-letter va worker noi bo.
- Forecast la xu ly nen sau khi user ghi log, khong nen lam cham request tao log.

## 4. RabbitMQ topology

Exchange:

- `baby.forecast.exchange`

Queues:

- `baby.forecast.pattern.queue`
- `baby.forecast.anomaly.queue`
- `baby.forecast.recommendation.queue`
- `baby.forecast.notification.queue`
- `baby.forecast.dlq`

Routing keys:

- `baby.activity.recorded`
- `baby.forecast.pattern.updated`
- `baby.forecast.anomaly.detected`
- `baby.forecast.recommendation.ready`
- `baby.forecast.notification.requested`

De xuat luong:

1. User tao baby log.
2. `baby-service` publish RabbitMQ `baby.activity.recorded`.
3. Pattern consumer doc log gan day, tinh baseline theo tung loai log.
4. Anomaly consumer so sanh event moi voi baseline.
5. Recommendation consumer tao goi y 12-24h.
6. Notification consumer chi gui canh bao neu risk level du cao.

Tat ca consumer tren deu la class trong `baby-service`, khong phai service moi.

## 5. Database schema

Them migration trong `baby-service`.

### `baby_forecast_snapshots`

Cot de xuat:

- `id`
- `baby_id`
- `family_id`
- `forecast_date`
- `generated_at`
- `horizon_hours`
- `sleep_window_start`
- `sleep_window_end`
- `feeding_window_start`
- `feeding_window_end`
- `risk_level`
- `summary`
- `recommendations_json`
- `signals_json`
- `created_at`
- `updated_at`

Index:

- `(baby_id, generated_at desc)`
- `(family_id, generated_at desc)`
- `(baby_id, forecast_date)`

### `baby_forecast_anomalies`

Cot de xuat:

- `id`
- `baby_id`
- `family_id`
- `source_log_id`
- `anomaly_type`
- `severity`
- `message`
- `detected_at`
- `resolved_at`
- `metadata_json`

Index:

- `(baby_id, detected_at desc)`
- `(family_id, detected_at desc)`
- `(source_log_id)`

### `baby_forecast_processed_messages`

Dung de idempotency cho RabbitMQ.

Cot de xuat:

- `message_id`
- `queue_name`
- `processed_at`

Unique:

- `(message_id, queue_name)`

## 6. API de them trong baby-service

Base path de xuat: `/api/babies/{babyId}/forecast`

Endpoints:

- `GET /latest`
  - Lay forecast moi nhat cua be.

- `GET /history?from=&to=`
  - Lay lich su forecast.

- `POST /refresh`
  - Tao forecast moi thu cong, publish RabbitMQ message va tra ve trang thai queued.

- `GET /anomalies?status=open`
  - Lay danh sach anomaly dang mo.

- `PATCH /anomalies/{anomalyId}/resolve`
  - Danh dau da xu ly hoac bo qua.

Can them permissions trong `authentication-service`:

- `API:GET:BABY_FORECAST_READ`
- `API:POST:BABY_FORECAST_REFRESH`
- `API:PATCH:BABY_FORECAST_ANOMALY_RESOLVE`

## 7. Thuat toan MVP

MVP nen lam rule-based truoc, khong can ML nang.

Input:

- Baby profile: ngay sinh, familyId.
- 7-14 ngay baby logs gan nhat.
- Growth records gan nhat neu co.
- Vaccination due date neu co.

Baseline:

- Gio ngu gan nhat theo ngay.
- Tong gio ngu moi ngay.
- Khoang cach trung binh giua cac bua an.
- So lan thay ta trung binh.
- Nhiet do hoac health note neu log co loai suc khoe.

Forecast:

- Neu log moi la `SLEEP`, du bao thoi diem thuc/day tiep theo dua tren trung vi cac giac ngu gan day.
- Neu log moi la `FEEDING`, du bao bua tiep theo dua tren khoang cach trung vi.
- Neu tong sleep trong 24h thap hon baseline 30% thi risk `MEDIUM`.
- Neu log suc khoe co gia tri nhiet do cao hon nguong thi risk `HIGH`.

Recommendation:

- `LOW`: goi y nhe.
- `MEDIUM`: tao checklist theo doi.
- `HIGH`: tao notification canh bao va noi ro can lien he bac si neu co dau hieu nghiem trong.

## 8. Cac file/code can sua

### baby-service

- `pom.xml`: them `spring-boot-starter-amqp`.
- `application.yml`: them cau hinh RabbitMQ.
- `config/RabbitMqConfig.java`: khai bao exchange, queues, bindings, converter.
- `event/BabyForecastEventPublisher.java`: publish message sau commit.
- `service/BabyService.java`: publish `baby.activity.recorded` sau khi tao log.
- `forecast/domain/*`: entity forecast/anomaly/processed message.
- `forecast/repository/*`: JPA repository.
- `forecast/service/BabyForecastService.java`: tinh forecast.
- `forecast/rabbit/BabyForecastConsumer.java`: consume queues.
- `forecast/controller/BabyForecastController.java`: API cho frontend.
- `resources/db/migration/V7__create_baby_forecast_tables.sql`: schema moi.

### notification-service

- Co the khong sua trong MVP neu dung Kafka `notification.requested` da co.
- Neu can type moi, them `NotificationType.BABY_FORECAST`.

### authentication-service

- Them migration permission cho API forecast.

### api-gateway

- Neu gateway dang route theo service path co san cho baby-service thi khong can sua.
- Neu co whitelist/route rieng, them route `/api/babies/**/forecast/**`.

### frontend

- Them API constants cho forecast.
- Them service Angular `baby-forecast.service.ts`.
- Them section trong `baby.component`.
- Them i18n cho `vi`, `en`, `ja`, `zh`.

### infrastructure

- `docker-compose.yml`: them RabbitMQ container va management UI.
- Env cho `baby-service`: `RABBITMQ_HOST`, `RABBITMQ_PORT`, `RABBITMQ_USERNAME`, `RABBITMQ_PASSWORD`.

## 9. Rollout theo phase

### Phase 1 - Infrastructure va contract

- Them RabbitMQ vao docker-compose.
- Them Spring AMQP vao `baby-service`.
- Tao RabbitMQ config, exchange, queues, DLQ.
- Tao message DTO va publisher.
- Chua can UI.

Ket qua: tao log cua be co message vao RabbitMQ.

### Phase 2 - Forecast storage va worker

- Tao migration forecast tables.
- Them entity/repository.
- Consumer xu ly `baby.activity.recorded`.
- Tinh forecast rule-based va luu snapshot.
- Them idempotency theo `messageId`.

Ket qua: moi baby log tao forecast snapshot moi.

### Phase 3 - API va frontend

- Them endpoint latest/history/anomalies.
- Them frontend section Forecast trong Baby page.
- Hien risk level, forecast timeline va recommendations.

Ket qua: user xem duoc du bao sau khi nhap log.

### Phase 4 - Notification

- Neu risk `HIGH`, publish Kafka `notification.requested`.
- Notification-service luu va day WebSocket nhu flow hien co.
- Frontend chuong notification hien canh bao.

Ket qua: user nhan canh bao realtime khi co anomaly quan trong.

### Phase 5 - AI explain optional

- `baby-service` gui summary va signals sang `ai-service`.
- `ai-service` tra ve explanation ngan gon, co disclaimer.
- Neu AI loi, fallback ve recommendation rule-based.

Ket qua: forecast co loi giai thich tu nhien hon nhung khong phu thuoc AI.

## 10. Tieu chi nghiem thu

- Tao baby log khong bi cham qua 300ms do forecast chay bat dong bo.
- RabbitMQ message co retry va vao DLQ khi loi lien tiep.
- Consumer xu ly idempotent, cung mot message khong tao trung forecast.
- `GET /latest` tra ve forecast moi nhat dung baby va family scope.
- Khi risk `HIGH`, notification duoc tao va WebSocket day ve frontend.
- UI forecast responsive tren desktop va mobile.
- Neu RabbitMQ down, tao baby log van thanh cong, he thong log loi publish va co co che retry/fallback phu hop.

## 11. Ranh gioi khong lam trong MVP

- Khong tao microservice moi.
- Khong dung ML phuc tap ngay tu dau.
- Khong de AI dua ra chan doan y te.
- Khong thay the Kafka hien co bang RabbitMQ.
- Khong sua lai toan bo dashboard Baby hien co.

