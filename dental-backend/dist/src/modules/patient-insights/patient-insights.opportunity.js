"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MIN_MEANINGFUL_CLINIC_AVG = exports.MAX_VISIT_VALUE_PER_PATIENT = exports.DEFAULT_VISIT_VALUE_FALLBACK = void 0;
exports.buildRevenueInvoiceWhere = buildRevenueInvoiceWhere;
exports.resolveClinicAvgVisitValue = resolveClinicAvgVisitValue;
exports.patientAvgFromInvoices = patientAvgFromInvoices;
exports.dedupeAtRiskBuckets = dedupeAtRiskBuckets;
exports.buildAtRiskScoreSelect = buildAtRiskScoreSelect;
exports.buildAtRiskListQueries = buildAtRiskListQueries;
exports.computeOpportunityValues = computeOpportunityValues;
const patient_insights_filters_js_1 = require("./patient-insights.filters.js");
exports.DEFAULT_VISIT_VALUE_FALLBACK = 1_500;
exports.MAX_VISIT_VALUE_PER_PATIENT = 500_000;
exports.MIN_MEANINGFUL_CLINIC_AVG = 100;
function buildRevenueInvoiceWhere(clinicId, branchId) {
    return {
        clinic_id: clinicId,
        ...(branchId ? { branch_id: branchId } : {}),
        net_amount: { gt: 0 },
        lifecycle_status: 'issued',
        status: { in: ['paid', 'partially_paid', 'pending'] },
    };
}
function resolveClinicAvgVisitValue(rawAvg) {
    if (rawAvg > exports.MIN_MEANINGFUL_CLINIC_AVG) {
        return Math.min(rawAvg, exports.MAX_VISIT_VALUE_PER_PATIENT);
    }
    return exports.DEFAULT_VISIT_VALUE_FALLBACK;
}
function patientAvgFromInvoices(invoices, clinicDefault) {
    const valid = invoices.filter((i) => Number(i.net_amount ?? 0) > 0);
    if (valid.length === 0)
        return clinicDefault;
    const avg = valid.reduce((s, i) => s + Number(i.net_amount), 0) / valid.length;
    return Math.min(Math.max(avg, 0), exports.MAX_VISIT_VALUE_PER_PATIENT);
}
function dedupeAtRiskBuckets(noShowRows, recallRows, churnRows) {
    const noShowIds = new Set(noShowRows.map((r) => r.patient_id));
    const recallIds = new Set(recallRows.map((r) => r.patient_id));
    const recallUnique = recallRows.filter((r) => !noShowIds.has(r.patient_id));
    const churnUnique = churnRows.filter((r) => !noShowIds.has(r.patient_id) && !recallIds.has(r.patient_id));
    return {
        noShowRows,
        recallUnique,
        churnUnique,
        totalUniquePatients: noShowRows.length + recallUnique.length + churnUnique.length,
    };
}
function buildAtRiskScoreSelect(branchId) {
    const invoiceWhere = branchId
        ? { net_amount: { gt: 0 }, branch_id: branchId, lifecycle_status: 'issued', status: { in: ['paid', 'partially_paid', 'pending'] } }
        : { net_amount: { gt: 0 }, lifecycle_status: 'issued', status: { in: ['paid', 'partially_paid', 'pending'] } };
    return {
        patient_id: true,
        patient: {
            select: {
                invoices: {
                    where: invoiceWhere,
                    orderBy: { created_at: 'desc' },
                    take: 5,
                    select: { net_amount: true },
                },
            },
        },
    };
}
function buildAtRiskListQueries(clinicId, branchId, now) {
    return [
        (0, patient_insights_filters_js_1.buildNoShowListWhere)(clinicId, branchId),
        (0, patient_insights_filters_js_1.buildRecallListWhere)(clinicId, branchId, now),
        (0, patient_insights_filters_js_1.buildChurnListWhere)(clinicId, branchId, now),
    ];
}
function computeOpportunityValues(buckets, clinicDefault) {
    const recallValue = buckets.recallUnique.reduce((s, r) => s + patientAvgFromInvoices(r.patient?.invoices ?? [], clinicDefault), 0);
    const noShowValue = buckets.noShowRows.reduce((s, r) => {
        const weight = r.no_show_risk === 'high' ? 0.8 : 0.5;
        return s + patientAvgFromInvoices(r.patient?.invoices ?? [], clinicDefault) * weight;
    }, 0);
    const churnValue = buckets.churnUnique.reduce((s, r) => s + patientAvgFromInvoices(r.patient?.invoices ?? [], clinicDefault), 0);
    const totalOpportunity = Math.round(recallValue + noShowValue + churnValue);
    return {
        recall: { count: buckets.recallUnique.length, value: Math.round(recallValue) },
        no_show: { count: buckets.noShowRows.length, value: Math.round(noShowValue) },
        inactive: { count: buckets.churnUnique.length, value: Math.round(churnValue) },
        total_patients: buckets.totalUniquePatients,
        total_opportunity: totalOpportunity,
    };
}
//# sourceMappingURL=patient-insights.opportunity.js.map