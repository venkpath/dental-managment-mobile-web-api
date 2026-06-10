"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INSIGHT_WINDOW_DAYS = exports.MS_PER_DAY = exports.OUTREACH_ATTRIBUTION_DAYS = exports.CAMPAIGN_COOLDOWN_DAYS = void 0;
exports.buildInsightBaseWhere = buildInsightBaseWhere;
exports.campaignCooldownBefore = campaignCooldownBefore;
exports.buildNoShowListWhere = buildNoShowListWhere;
exports.buildRecallListWhere = buildRecallListWhere;
exports.buildChurnListWhere = buildChurnListWhere;
exports.buildRecallCampaignWhere = buildRecallCampaignWhere;
exports.buildChurnCampaignWhere = buildChurnCampaignWhere;
exports.buildListWhereByType = buildListWhereByType;
exports.buildCampaignScoreWhere = buildCampaignScoreWhere;
exports.buildEligibleWhere = buildEligibleWhere;
exports.explainRecallExclusion = explainRecallExclusion;
exports.isRecallListVisible = isRecallListVisible;
exports.isChurnListVisible = isChurnListVisible;
exports.CAMPAIGN_COOLDOWN_DAYS = 7;
exports.OUTREACH_ATTRIBUTION_DAYS = 30;
exports.MS_PER_DAY = 86_400_000;
exports.INSIGHT_WINDOW_DAYS = 30;
function buildInsightBaseWhere(clinicId, branchId) {
    if (!branchId)
        return { clinic_id: clinicId };
    return {
        clinic_id: clinicId,
        patient: { branch_id: branchId },
    };
}
function campaignCooldownBefore(now = new Date()) {
    return new Date(now.getTime() - exports.CAMPAIGN_COOLDOWN_DAYS * exports.MS_PER_DAY);
}
function buildNoShowListWhere(clinicId, branchId, riskLevels = ['high', 'medium']) {
    return {
        ...buildInsightBaseWhere(clinicId, branchId),
        no_show_risk: { in: riskLevels },
    };
}
function notSnoozed(field, now) {
    return {
        OR: [{ [field]: null }, { [field]: { lte: now } }],
    };
}
function withoutActiveReturn(now) {
    const recentSince = new Date(now.getTime() - exports.OUTREACH_ATTRIBUTION_DAYS * exports.MS_PER_DAY);
    return {
        AND: [
            {
                NOT: {
                    patient: {
                        appointments: {
                            some: { appointment_date: { gte: now }, status: { not: 'cancelled' } },
                        },
                    },
                },
            },
            {
                NOT: {
                    patient: {
                        invoices: {
                            some: {
                                lifecycle_status: 'issued',
                                status: { in: ['paid', 'partially_paid'] },
                                created_at: { gte: recentSince },
                            },
                        },
                    },
                },
            },
        ],
    };
}
function buildRecallListWhere(clinicId, branchId, now = new Date()) {
    return {
        ...buildInsightBaseWhere(clinicId, branchId),
        recall_due: true,
        AND: [
            {
                OR: [{ recall_status: null }, { recall_status: { not: 'moved_inactive' } }],
            },
            notSnoozed('recall_snoozed_until', now),
            { churn_risk: { notIn: ['medium', 'high'] } },
            withoutActiveReturn(now),
        ],
    };
}
function buildChurnListWhere(clinicId, branchId, now = new Date()) {
    return {
        ...buildInsightBaseWhere(clinicId, branchId),
        AND: [
            {
                OR: [
                    { churn_risk: { in: ['medium', 'high'] } },
                    { recall_status: 'moved_inactive' },
                ],
            },
            {
                OR: [{ churn_retry_after: null }, { churn_retry_after: { lt: now } }],
            },
            {
                OR: [{ churn_status: null }, { churn_status: { not: 'declined' } }],
            },
            notSnoozed('churn_snoozed_until', now),
            withoutActiveReturn(now),
        ],
    };
}
function buildRecallCampaignWhere(clinicId, branchId, now = new Date()) {
    const cooldown = campaignCooldownBefore(now);
    return {
        AND: [
            buildRecallListWhere(clinicId, branchId, now),
            {
                OR: [
                    { recall_last_contacted_at: null },
                    { recall_last_contacted_at: { lt: cooldown } },
                ],
            },
        ],
    };
}
function buildChurnCampaignWhere(clinicId, branchId, riskLevel, now = new Date()) {
    const cooldown = campaignCooldownBefore(now);
    const base = buildChurnListWhere(clinicId, branchId, now);
    if (riskLevel && riskLevel !== 'all') {
        const levels = riskLevel === 'high' ? ['high'] : ['medium'];
        return {
            AND: [
                base,
                {
                    OR: [
                        { recall_status: 'moved_inactive' },
                        { churn_risk: { in: levels } },
                    ],
                },
                {
                    OR: [
                        { churn_last_contacted_at: null },
                        { churn_last_contacted_at: { lt: cooldown } },
                    ],
                },
            ],
        };
    }
    return {
        AND: [
            base,
            {
                OR: [
                    { churn_last_contacted_at: null },
                    { churn_last_contacted_at: { lt: cooldown } },
                ],
            },
        ],
    };
}
function buildListWhereByType(type, clinicId, branchId, now = new Date()) {
    switch (type) {
        case 'no_show':
            return buildNoShowListWhere(clinicId, branchId);
        case 'recall':
            return buildRecallListWhere(clinicId, branchId, now);
        case 'churn':
            return buildChurnListWhere(clinicId, branchId, now);
        case 'conversion':
            return { ...buildInsightBaseWhere(clinicId, branchId), conversion_score: { gte: 40 } };
    }
}
function buildCampaignScoreWhere(segmentType, clinicId, config, now = new Date()) {
    const branchId = typeof config.branch_id === 'string' ? config.branch_id : undefined;
    switch (segmentType) {
        case 'recall_due':
            return buildRecallCampaignWhere(clinicId, branchId, now);
        case 'churn_risk':
            return buildChurnCampaignWhere(clinicId, branchId, typeof config.risk_level === 'string' ? config.risk_level : undefined, now);
        case 'no_show_risk': {
            const level = typeof config.risk_level === 'string' ? config.risk_level : 'all';
            const levels = level === 'high' ? ['high'] : level === 'medium' ? ['medium'] : ['high', 'medium'];
            return buildNoShowListWhere(clinicId, branchId, levels);
        }
        default:
            return null;
    }
}
function buildEligibleWhere(type, clinicId, branchId, now = new Date()) {
    return type === 'recall'
        ? buildRecallCampaignWhere(clinicId, branchId, now)
        : buildChurnCampaignWhere(clinicId, branchId, undefined, now);
}
function explainRecallExclusion(score, opts, now = new Date()) {
    const reasons = [];
    if (!score.recall_due)
        reasons.push('recall_due is false — run Recompute after adding a completed treatment');
    if (score.recall_status === 'moved_inactive') {
        reasons.push('recall_status is moved_inactive (30-day recall window expired — patient moved to inactive list)');
    }
    if (score.recall_snoozed_until && score.recall_snoozed_until > now) {
        reasons.push(`recall is snoozed until ${score.recall_snoozed_until.toISOString()}`);
    }
    if (score.churn_risk === 'medium' || score.churn_risk === 'high') {
        reasons.push(`churn_risk is ${score.churn_risk} — inactive patients are excluded from recall list`);
    }
    const factors = score.churn_factors;
    if (factors?.has_future_appt) {
        reasons.push('has_future_appt is true — patient already has an upcoming appointment');
    }
    if (opts?.branchId) {
        const patientBranch = score.patient?.branch_id ?? score.branch_id;
        if (patientBranch !== opts.branchId) {
            reasons.push(`branch filter mismatch — patient branch ${patientBranch ?? 'unknown'} ≠ requested ${opts.branchId}`);
        }
    }
    const visibleOnList = score.recall_due && reasons.length === 0;
    const badgeReasons = reasons.filter((r) => !r.startsWith('branch filter'));
    const visibleOnBadge = score.recall_due && badgeReasons.length === 0;
    return {
        visible_on_list: visibleOnList,
        visible_on_badge: visibleOnBadge,
        exclusion_reasons: reasons,
    };
}
function isRecallListVisible(score, now = new Date()) {
    if (!score.recall_due)
        return false;
    if (score.recall_status === 'moved_inactive')
        return false;
    if (score.recall_snoozed_until && score.recall_snoozed_until > now)
        return false;
    if (score.churn_risk === 'medium' || score.churn_risk === 'high')
        return false;
    const factors = score.churn_factors;
    if (factors?.has_future_appt)
        return false;
    return true;
}
function isChurnListVisible(score, now = new Date()) {
    const factors = score.churn_factors;
    if (factors?.has_future_appt)
        return false;
    if (score.churn_status === 'declined')
        return false;
    if (score.churn_snoozed_until && score.churn_snoozed_until > now)
        return false;
    if (score.churn_retry_after && score.churn_retry_after > now)
        return false;
    return (score.churn_risk === 'medium' ||
        score.churn_risk === 'high' ||
        score.recall_status === 'moved_inactive');
}
//# sourceMappingURL=patient-insights.filters.js.map