"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuditLogInterceptor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogInterceptor = void 0;
const common_1 = require("@nestjs/common");
const rxjs_1 = require("rxjs");
const audit_log_service_js_1 = require("../../modules/audit-log/audit-log.service.js");
const METHOD_ACTION_MAP = {
    POST: 'create',
    PATCH: 'update',
    PUT: 'update',
    DELETE: 'delete',
};
const ENTITY_MAP = {
    appointments: 'appointment',
    patients: 'patient',
    treatments: 'treatment',
    prescriptions: 'prescription',
    invoices: 'invoice',
    payments: 'payment',
    branches: 'branch',
    clinics: 'clinic',
    users: 'user',
    inventory: 'inventory',
    attachments: 'attachment',
    notifications: 'notification',
    teeth: 'tooth',
};
const EXCLUDED_SEGMENTS = ['health', 'auth', 'docs', 'test-queue'];
let AuditLogInterceptor = AuditLogInterceptor_1 = class AuditLogInterceptor {
    auditLogService;
    logger = new common_1.Logger(AuditLogInterceptor_1.name);
    constructor(auditLogService) {
        this.auditLogService = auditLogService;
    }
    intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const method = request.method;
        const action = METHOD_ACTION_MAP[method];
        if (!action) {
            return next.handle();
        }
        const fullPath = (request.originalUrl || request.url || '').split('?')[0];
        const clinicId = request.clinicId;
        if (!clinicId) {
            return next.handle();
        }
        const entity = this.extractEntity(fullPath);
        if (!entity || EXCLUDED_SEGMENTS.includes(entity)) {
            return next.handle();
        }
        const userId = request.user?.userId;
        const requestBody = request.body ? { ...request.body } : undefined;
        if (requestBody) {
            delete requestBody.password;
            delete requestBody.password_hash;
            delete requestBody.old_password;
            delete requestBody.new_password;
        }
        const ip = request.ip || request.headers['x-forwarded-for'] || undefined;
        const userAgent = request.headers['user-agent'] || undefined;
        return next.handle().pipe((0, rxjs_1.tap)((responseBody) => {
            try {
                if (!responseBody || typeof responseBody !== 'object') {
                    return;
                }
                const body = responseBody;
                let entityId = body['id'];
                if (!entityId && body['data'] && typeof body['data'] === 'object') {
                    entityId = body['data']['id'];
                }
                if (!entityId) {
                    return;
                }
                const entityName = ENTITY_MAP[entity] || entity;
                const metadata = {};
                if (action === 'create' && requestBody) {
                    metadata.input = requestBody;
                }
                else if (action === 'update' && requestBody) {
                    metadata.changes = requestBody;
                }
                else if (action === 'delete') {
                    metadata.deleted = true;
                }
                if (ip)
                    metadata.ip = ip;
                if (userAgent)
                    metadata.user_agent = userAgent;
                this.auditLogService
                    .log({
                    clinic_id: clinicId,
                    user_id: userId,
                    action,
                    entity: entityName,
                    entity_id: entityId,
                    metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
                })
                    .then(() => {
                    this.logger.debug(`Audit: ${action} ${entityName} ${entityId}`);
                })
                    .catch((err) => {
                    this.logger.error(`Failed to write audit log: ${err.message}`);
                });
            }
            catch (err) {
                this.logger.error(`Audit interceptor error: ${err.message}`);
            }
        }));
    }
    extractEntity(path) {
        const segments = path
            .replace(/^\/api\/v1\//, '')
            .replace(/^\//, '')
            .split('/')
            .filter(Boolean);
        for (const segment of segments) {
            if (!this.isUuid(segment)) {
                return segment;
            }
        }
        return null;
    }
    isUuid(value) {
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    }
};
exports.AuditLogInterceptor = AuditLogInterceptor;
exports.AuditLogInterceptor = AuditLogInterceptor = AuditLogInterceptor_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [audit_log_service_js_1.AuditLogService])
], AuditLogInterceptor);
//# sourceMappingURL=audit-log.interceptor.js.map