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
exports.isRecallListVisible = isRecallListVisible;
exports.isChurnListVisible = isChurnListVisible;
exports.CAMPAIGN_COOLDOWN_DAYS = 7;
exports.OUTREACH_ATTRIBUTION_DAYS = 30;
exports.MS_PER_DAY = 86_400_000;
exports.INSIGHT_WINDOW_DAYS = 30;
function buildInsightBaseWhere(clinicId, branchId) {
    return branchId ? { clinic_id: clinicId, branch_id: branchId } : { clinic_id: clinicId };
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
function buildRecallListWhere(clinicId, branchId, now = new Date()) {
    return {
        ...buildInsightBaseWhere(clinicId, branchId),
        recall_due: true,
        NOT: [
            { recall_status: 'moved_inactive' },
            { recall_snoozed_until: { gt: now } },
            { churn_risk: { in: ['medium', 'high'] } },
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
        ],
        NOT: [
            { churn_status: 'declined' },
            { churn_snoozed_until: { gt: now } },
            { churn_factors: { path: ['has_future_appt'], equals: true } },
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
function isRecallListVisible(score, now = new Date()) {
    if (!score.recall_due)
        return false;
    if (score.recall_status === 'moved_inactive')
        return false;
    if (score.recall_snoozed_until && score.recall_snoozed_until > now)
        return false;
    if (score.churn_risk === 'medium' || score.churn_risk === 'high')
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