# notification-service

Handles reminder and event notifications for Mom Super App.

## Capabilities

- create notification requests via REST API
- consume `notification.requested` Kafka topic
- store notification history in PostgreSQL
- mark notification as read
- scheduled dispatcher that marks due notifications as sent
