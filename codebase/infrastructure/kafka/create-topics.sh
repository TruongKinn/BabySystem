#!/bin/sh
set -e

BOOTSTRAP_SERVER="${KAFKA_BOOTSTRAP_SERVER:-kafka:9092}"

create_topic() {
  TOPIC_NAME="$1"
  echo "Creating topic: ${TOPIC_NAME}"
  kafka-topics --bootstrap-server "${BOOTSTRAP_SERVER}" \
    --create \
    --if-not-exists \
    --topic "${TOPIC_NAME}" \
    --partitions 1 \
    --replication-factor 1
}

create_topic "user.created"
create_topic "family.created"
create_topic "expense.created"
create_topic "expense.updated"
create_topic "expense.deleted"
create_topic "meal.plan.created"
create_topic "baby.log.created"
create_topic "task.created"
create_topic "task.completed"
create_topic "notification.requested"

echo "Kafka topic bootstrap completed."
