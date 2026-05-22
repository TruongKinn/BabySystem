package com.mom.insight.service;

import com.mom.insight.controller.dto.InsightDailyResponse;
import com.mom.insight.controller.dto.InsightDashboardResponse;
import com.mom.insight.controller.dto.InsightMonthlyResponse;
import com.mom.insight.domain.InsightDailyStatEntity;
import com.mom.insight.premium.PremiumFeatures;
import com.mom.insight.repository.InsightDailyStatRepository;
import com.mom.common.security.DataIsolationUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.List;

@Service
@RequiredArgsConstructor
public class InsightService {

    private final InsightDailyStatRepository insightDailyStatRepository;
    private final PremiumAccessService premiumAccessService;

    @Transactional
    public void recordExpenseCreated(Long familyId, LocalDate date, BigDecimal amount) {
        InsightDailyStatEntity stat = getOrCreate(familyId, date);
        stat.setExpenseTotal(stat.getExpenseTotal().add(amount));
        stat.setExpenseCount(stat.getExpenseCount() + 1);
        insightDailyStatRepository.save(stat);
    }

    @Transactional
    public void recordMealPlanCreated(Long familyId, LocalDate date) {
        InsightDailyStatEntity stat = getOrCreate(familyId, date);
        stat.setMealsPlanned(stat.getMealsPlanned() + 1);
        insightDailyStatRepository.save(stat);
    }

    @Transactional
    public void recordTaskCreated(Long familyId, LocalDate date) {
        InsightDailyStatEntity stat = getOrCreate(familyId, date);
        stat.setTasksCreated(stat.getTasksCreated() + 1);
        insightDailyStatRepository.save(stat);
    }

    @Transactional
    public void recordTaskCompleted(Long familyId, LocalDate date) {
        InsightDailyStatEntity stat = getOrCreate(familyId, date);
        stat.setTasksCompleted(stat.getTasksCompleted() + 1);
        insightDailyStatRepository.save(stat);
    }

    @Transactional
    public void recordBabyLogCreated(Long familyId, LocalDate date, String logType, BigDecimal value) {
        InsightDailyStatEntity stat = getOrCreate(familyId, date);
        if ("SLEEP".equalsIgnoreCase(logType)) {
            stat.setBabySleepHours(stat.getBabySleepHours().add(value != null ? value : BigDecimal.ZERO));
        } else if ("FEEDING".equalsIgnoreCase(logType)) {
            stat.setBabyFeedings(stat.getBabyFeedings() + 1);
        } else if ("DIAPER".equalsIgnoreCase(logType)) {
            stat.setDiaperChanges(stat.getDiaperChanges() + 1);
        }
        insightDailyStatRepository.save(stat);
    }

    public InsightDailyResponse getDaily(Long familyId, LocalDate date) {
        DataIsolationUtil.validateFamilyAccess(familyId);

        LocalDate targetDate = date != null ? date : LocalDate.now(ZoneOffset.UTC);
        InsightDailyStatEntity stat = getOrCreateView(familyId, targetDate);
        return toInsightDailyResponse(stat);
    }

    public InsightDashboardResponse getDashboard(Long familyId, LocalDate date) {
        DataIsolationUtil.validateFamilyAccess(familyId);

        InsightDailyResponse daily = getDaily(familyId, date);
        int sleepScore = daily.babySleepHours()
                .divide(BigDecimal.valueOf(12), 4, RoundingMode.HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .setScale(0, RoundingMode.HALF_UP)
                .intValue();
        int taskPenalty = Math.toIntExact(Math.min(daily.pendingTasks() * 8, 80));
        int moodScore = Math.max(0, Math.min(100, sleepScore - taskPenalty + 20));

        return new InsightDashboardResponse(
                daily.familyId(),
                daily.date(),
                daily.expenseTotal(),
                daily.pendingTasks(),
                daily.mealsPlanned(),
                daily.babySleepHours(),
                daily.babyFeedings(),
                daily.diaperChanges(),
                moodScore
        );
    }

    public InsightMonthlyResponse getMonthly(Long familyId, YearMonth month) {
        DataIsolationUtil.validateFamilyAccess(familyId);
        premiumAccessService.requireFeature(familyId, PremiumFeatures.PREMIUM_REPORTS);

        YearMonth yearMonth = month != null ? month : YearMonth.now(ZoneOffset.UTC);
        LocalDate from = yearMonth.atDay(1);
        LocalDate to = yearMonth.atEndOfMonth();
        List<InsightDailyStatEntity> stats = insightDailyStatRepository
                .findByFamilyIdAndStatDateBetweenOrderByStatDateAsc(familyId, from, to);

        BigDecimal expenseTotal = stats.stream()
                .map(InsightDailyStatEntity::getExpenseTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long expenseCount = stats.stream().mapToLong(InsightDailyStatEntity::getExpenseCount).sum();
        long mealsPlanned = stats.stream().mapToLong(InsightDailyStatEntity::getMealsPlanned).sum();
        long tasksCreated = stats.stream().mapToLong(InsightDailyStatEntity::getTasksCreated).sum();
        long tasksCompleted = stats.stream().mapToLong(InsightDailyStatEntity::getTasksCompleted).sum();
        BigDecimal babySleepHours = stats.stream()
                .map(InsightDailyStatEntity::getBabySleepHours)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        long babyFeedings = stats.stream().mapToLong(InsightDailyStatEntity::getBabyFeedings).sum();
        long diaperChanges = stats.stream().mapToLong(InsightDailyStatEntity::getDiaperChanges).sum();

        List<InsightMonthlyResponse.DailyItem> dailyItems = stats.stream()
                .map(stat -> new InsightMonthlyResponse.DailyItem(
                        stat.getStatDate().toString(),
                        stat.getExpenseTotal(),
                        Math.max(0, stat.getTasksCreated() - stat.getTasksCompleted()),
                        stat.getBabySleepHours()
                ))
                .toList();

        return new InsightMonthlyResponse(
                familyId,
                yearMonth.toString(),
                expenseTotal,
                expenseCount,
                mealsPlanned,
                tasksCreated,
                tasksCompleted,
                babySleepHours,
                babyFeedings,
                diaperChanges,
                dailyItems
        );
    }

    @Transactional
    protected InsightDailyStatEntity getOrCreate(Long familyId, LocalDate date) {
        return insightDailyStatRepository.findByFamilyIdAndStatDate(familyId, date)
                .orElseGet(() -> {
                    InsightDailyStatEntity stat = new InsightDailyStatEntity();
                    stat.setFamilyId(familyId);
                    stat.setStatDate(date);
                    stat.setExpenseTotal(BigDecimal.ZERO);
                    stat.setBabySleepHours(BigDecimal.ZERO);
                    return insightDailyStatRepository.save(stat);
                });
    }

    private InsightDailyStatEntity getOrCreateView(Long familyId, LocalDate date) {
        return insightDailyStatRepository.findByFamilyIdAndStatDate(familyId, date)
                .orElseGet(() -> {
                    InsightDailyStatEntity stat = new InsightDailyStatEntity();
                    stat.setFamilyId(familyId);
                    stat.setStatDate(date);
                    stat.setExpenseTotal(BigDecimal.ZERO);
                    stat.setBabySleepHours(BigDecimal.ZERO);
                    return stat;
                });
    }

    private InsightDailyResponse toInsightDailyResponse(InsightDailyStatEntity stat) {
        long pendingTasks = Math.max(0, stat.getTasksCreated() - stat.getTasksCompleted());
        return new InsightDailyResponse(
                stat.getFamilyId(),
                stat.getStatDate(),
                stat.getExpenseTotal(),
                stat.getExpenseCount(),
                stat.getMealsPlanned(),
                stat.getTasksCreated(),
                stat.getTasksCompleted(),
                pendingTasks,
                stat.getBabySleepHours(),
                stat.getBabyFeedings(),
                stat.getDiaperChanges()
        );
    }
}
