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
create_topic "expense.proposal.submitted"
create_topic "expense.proposal.approved"
create_topic "expense.proposal.rejected"
create_topic "expense.proposal.resubmitted"
create_topic "expense.proposal.approval.started"
create_topic "expense.proposal.approval.completed"
create_topic "expense.proposal.approval.failed"
create_topic "expense.proposal.approval.compensated"
create_topic "notification.requested.dlq"
create_topic "expense.proposal.submitted.dlq"
create_topic "expense.proposal.approved.dlq"
create_topic "expense.proposal.rejected.dlq"
create_topic "expense.proposal.resubmitted.dlq"
create_topic "expense.proposal.approval.started.dlq"
create_topic "expense.proposal.approval.completed.dlq"
create_topic "expense.proposal.approval.failed.dlq"
create_topic "expense.proposal.approval.compensated.dlq"
create_topic "meal.plan.created"
create_topic "baby.log.created"
create_topic "task.created"
create_topic "task.completed"
create_topic "notification.requested"

echo "Kafka topic bootstrap completed."
