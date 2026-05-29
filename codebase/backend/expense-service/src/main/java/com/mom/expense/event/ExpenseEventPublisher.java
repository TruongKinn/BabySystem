package com.mom.expense.event;

import com.mom.common.kafka.BaseEvent;
import com.mom.common.kafka.EventTopics;
import com.mom.expense.domain.ExpenseProposalEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class ExpenseEventPublisher {

    private final OutboxEventPublisher outboxEventPublisher;

    public void publishExpenseCreated(Long familyId, ExpenseChangedPayload payload) {
        publish(EventTopics.EXPENSE_CREATED, familyId, payload);
    }

    public void publishExpenseUpdated(Long familyId, ExpenseChangedPayload payload) {
        publish(EventTopics.EXPENSE_UPDATED, familyId, payload);
    }

    public void publishExpenseDeleted(Long familyId, ExpenseChangedPayload payload) {
        publish(EventTopics.EXPENSE_DELETED, familyId, payload);
    }

    public void publishProposalSubmitted(ExpenseProposalEntity proposal, Long userId) {
        publishProposal(EventTopics.EXPENSE_PROPOSAL_SUBMITTED, proposal, userId, "SUBMITTED", null);
    }

    public void publishProposalApproved(ExpenseProposalEntity proposal, Long userId, Long expenseId) {
        publishProposal(EventTopics.EXPENSE_PROPOSAL_APPROVED, proposal, userId, "APPROVED", expenseId);
    }

    public void publishProposalApprovalStarted(ExpenseProposalEntity proposal, Long userId) {
        publishProposal(EventTopics.EXPENSE_PROPOSAL_APPROVAL_STARTED, proposal, userId, "APPROVAL_STARTED", null);
    }

    public void publishProposalApprovalCompleted(ExpenseProposalEntity proposal, Long userId, Long expenseId) {
        publishProposal(EventTopics.EXPENSE_PROPOSAL_APPROVAL_COMPLETED, proposal, userId, "APPROVAL_COMPLETED", expenseId);
    }

    public void publishProposalApprovalFailed(ExpenseProposalEntity proposal, Long userId, String failureReason) {
        publishProposal(EventTopics.EXPENSE_PROPOSAL_APPROVAL_FAILED, proposal, userId, "APPROVAL_FAILED", null, failureReason);
    }

    public void publishProposalApprovalCompensated(ExpenseProposalEntity proposal, Long userId, Long expenseId, String reason) {
        publishProposal(EventTopics.EXPENSE_PROPOSAL_APPROVAL_COMPENSATED, proposal, userId, "APPROVAL_COMPENSATED", expenseId, reason);
    }

    public void publishProposalRejected(ExpenseProposalEntity proposal, Long userId) {
        publishProposal(EventTopics.EXPENSE_PROPOSAL_REJECTED, proposal, userId, "REJECTED", null);
    }

    public void publishProposalResubmitted(ExpenseProposalEntity proposal, Long userId) {
        publishProposal(EventTopics.EXPENSE_PROPOSAL_RESUBMITTED, proposal, userId, "RESUBMITTED", null);
    }

    private void publish(String topic, Long familyId, ExpenseChangedPayload payload) {
        BaseEvent<ExpenseChangedPayload> event = new BaseEvent<>(
                UUID.randomUUID().toString(),
                topic,
                OffsetDateTime.now(),
                familyId,
                null,
                payload
        );
        outboxEventPublisher.publish(topic, String.valueOf(payload.expenseId()), event);
    }

    private void publishProposal(
            String topic,
            ExpenseProposalEntity proposal,
            Long userId,
            String action,
            Long expenseId
    ) {
        publishProposal(topic, proposal, userId, action, expenseId, proposal.getRejectReason());
    }

    private void publishProposal(
            String topic,
            ExpenseProposalEntity proposal,
            Long userId,
            String action,
            Long expenseId,
            String reason
    ) {
        ExpenseProposalSagaPayload payload = new ExpenseProposalSagaPayload(
                proposal.getId(),
                proposal.getFamilyId(),
                proposal.getTitle(),
                proposal.getAmount(),
                proposal.getCategoryName(),
                proposal.getProposedBy(),
                proposal.getApprover(),
                proposal.getStatus(),
                action,
                reason,
                expenseId,
                OffsetDateTime.now()
        );
        BaseEvent<ExpenseProposalSagaPayload> event = new BaseEvent<>(
                UUID.randomUUID().toString(),
                topic,
                OffsetDateTime.now(),
                proposal.getFamilyId(),
                userId,
                payload
        );
        outboxEventPublisher.publish(topic, String.valueOf(proposal.getId()), event);
    }
}
