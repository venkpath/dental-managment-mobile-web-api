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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var WebhookController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommunicationController = exports.WebhookController = exports.OptOutController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const swagger_1 = require("@nestjs/swagger");
const require_clinic_guard_js_1 = require("../../common/guards/require-clinic.guard.js");
const public_decorator_js_1 = require("../../common/decorators/public.decorator.js");
const current_clinic_decorator_js_1 = require("../../common/decorators/current-clinic.decorator.js");
const require_feature_decorator_js_1 = require("../../common/decorators/require-feature.decorator.js");
const communication_service_js_1 = require("./communication.service.js");
const send_message_dto_js_1 = require("./dto/send-message.dto.js");
const query_message_dto_js_1 = require("./dto/query-message.dto.js");
const update_preferences_dto_js_1 = require("./dto/update-preferences.dto.js");
const update_clinic_settings_dto_js_1 = require("./dto/update-clinic-settings.dto.js");
const whatsapp_embedded_signup_dto_js_1 = require("./dto/whatsapp-embedded-signup.dto.js");
let OptOutController = class OptOutController {
    communicationService;
    constructor(communicationService) {
        this.communicationService = communicationService;
    }
    async optOut(body, req) {
        if (!body.token) {
            throw new common_1.BadRequestException('Token is required');
        }
        const ipAddress = req.ip || req.headers['x-forwarded-for'];
        return this.communicationService.processOptOut(body.token, body.channels, ipAddress);
    }
    async verify(token) {
        if (!token) {
            throw new common_1.BadRequestException('Token is required');
        }
        const verified = this.communicationService.verifyOptOutToken(token);
        if (!verified) {
            throw new common_1.BadRequestException('Invalid or expired unsubscribe link');
        }
        return { valid: true, patient_id: verified.patientId };
    }
};
exports.OptOutController = OptOutController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Process opt-out request from signed link (public, no auth)' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], OptOutController.prototype, "optOut", null);
__decorate([
    (0, common_1.Get)('verify'),
    (0, swagger_1.ApiOperation)({ summary: 'Verify opt-out token and return patient info (public)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], OptOutController.prototype, "verify", null);
exports.OptOutController = OptOutController = __decorate([
    (0, public_decorator_js_1.Public)(),
    (0, swagger_1.ApiTags)('Communication — Opt-Out'),
    (0, common_1.Controller)('communication/opt-out'),
    __metadata("design:paramtypes", [communication_service_js_1.CommunicationService])
], OptOutController);
let WebhookController = WebhookController_1 = class WebhookController {
    communicationService;
    configService;
    logger = new common_1.Logger(WebhookController_1.name);
    constructor(communicationService, configService) {
        this.communicationService = communicationService;
        this.configService = configService;
    }
    async smsDeliveryReport(body) {
        this.logger.debug(`SMS DLR webhook received: ${JSON.stringify(body).substring(0, 200)}`);
        return this.communicationService.handleSmsDeliveryWebhook(body);
    }
    verifyWhatsAppWebhook(mode, verifyToken, challenge, res) {
        const expectedToken = this.configService.get('app.whatsapp.webhookVerifyToken');
        this.logger.log(`WhatsApp webhook verification: mode=${mode}, token=${verifyToken ? '***' : 'missing'}`);
        if (mode === 'subscribe' && verifyToken === expectedToken) {
            this.logger.log('WhatsApp webhook verified successfully');
            return res.status(200).send(challenge);
        }
        this.logger.warn('WhatsApp webhook verification failed — token mismatch');
        return res.status(403).send('Verification failed');
    }
    async whatsappWebhook(req, body) {
        const signature = req.headers['x-hub-signature-256'];
        const appSecret = this.configService.get('app.facebook.appSecret');
        if (appSecret && signature) {
            const { createHmac } = await import('crypto');
            const rawBody = JSON.stringify(body);
            const expected = 'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex');
            if (signature !== expected) {
                this.logger.warn('WhatsApp webhook signature mismatch — rejecting payload');
                return { error: 'Invalid signature' };
            }
        }
        else if (appSecret && !signature) {
            this.logger.warn('WhatsApp webhook missing X-Hub-Signature-256 header');
        }
        this.logger.debug(`WhatsApp webhook received: ${JSON.stringify(body).substring(0, 500)}`);
        return this.communicationService.handleWhatsAppWebhook(body);
    }
};
exports.WebhookController = WebhookController;
__decorate([
    (0, common_1.Post)('sms/delivery'),
    (0, swagger_1.ApiOperation)({ summary: 'MSG91 SMS delivery report webhook (DLR callback)' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WebhookController.prototype, "smsDeliveryReport", null);
__decorate([
    (0, common_1.Get)('whatsapp'),
    (0, swagger_1.ApiOperation)({ summary: 'Meta WhatsApp webhook verification (responds to hub.challenge)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Query)('hub.mode')),
    __param(1, (0, common_1.Query)('hub.verify_token')),
    __param(2, (0, common_1.Query)('hub.challenge')),
    __param(3, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], WebhookController.prototype, "verifyWhatsAppWebhook", null);
__decorate([
    (0, common_1.Post)('whatsapp'),
    (0, swagger_1.ApiOperation)({ summary: 'Meta WhatsApp Cloud API webhook (status updates + incoming messages)' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WebhookController.prototype, "whatsappWebhook", null);
exports.WebhookController = WebhookController = WebhookController_1 = __decorate([
    (0, public_decorator_js_1.Public)(),
    (0, swagger_1.ApiTags)('Communication — Webhooks'),
    (0, common_1.Controller)('communication/webhooks'),
    __metadata("design:paramtypes", [communication_service_js_1.CommunicationService,
        config_1.ConfigService])
], WebhookController);
let CommunicationController = class CommunicationController {
    communicationService;
    constructor(communicationService) {
        this.communicationService = communicationService;
    }
    async sendMessage(clinicId, dto) {
        return this.communicationService.sendMessage(clinicId, dto);
    }
    async findAllMessages(clinicId, query) {
        return this.communicationService.findAllMessages(clinicId, query);
    }
    async getStats(clinicId, startDate, endDate) {
        return this.communicationService.getMessageStats(clinicId, startDate, endDate);
    }
    async findOneMessage(clinicId, id) {
        return this.communicationService.findOneMessage(clinicId, id);
    }
    async getCircuitBreakerStatus(clinicId) {
        return this.communicationService.getCircuitBreakerStatus(clinicId);
    }
    async getPreferences(clinicId, patientId) {
        return this.communicationService.getPatientPreferences(clinicId, patientId);
    }
    async getPatientTimeline(clinicId, patientId, page, limit, channel) {
        return this.communicationService.getPatientTimeline(clinicId, patientId, page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 20, channel);
    }
    async updatePreferences(clinicId, patientId, dto, req) {
        const ipAddress = req.ip || req.headers['x-forwarded-for'];
        return this.communicationService.updatePatientPreferences(clinicId, patientId, dto, 'clinic_staff', ipAddress);
    }
    async getSettings(clinicId) {
        return this.communicationService.getClinicSettings(clinicId);
    }
    async updateSettings(clinicId, dto) {
        return this.communicationService.updateClinicSettings(clinicId, dto);
    }
    async ndncCheck(phone) {
        return this.communicationService.checkNdncStatus(phone);
    }
    async sendTestEmail(clinicId, body) {
        if (!body.to) {
            throw new common_1.BadRequestException('Property "to" (email address) is required');
        }
        return this.communicationService.sendTestEmail(clinicId, body.to);
    }
    async sendTestSms(clinicId, body) {
        if (!body.to) {
            throw new common_1.BadRequestException('Property "to" (phone number) is required');
        }
        return this.communicationService.sendTestSms(clinicId, body.to, body.dlt_template_id, body.variables);
    }
    async verifySmtp(clinicId) {
        return this.communicationService.verifySmtp(clinicId);
    }
    async syncWhatsAppTemplates(clinicId) {
        return this.communicationService.syncWhatsAppTemplates(clinicId);
    }
    async submitWhatsAppTemplate(clinicId, body) {
        if (!body.elementName || !body.body) {
            throw new common_1.BadRequestException('elementName and body are required');
        }
        return this.communicationService.submitWhatsAppTemplate(clinicId, body);
    }
    async getWhatsAppTemplateStatus(clinicId, templateName) {
        return this.communicationService.getWhatsAppTemplateStatus(clinicId, templateName);
    }
    async completeEmbeddedSignup(clinicId, dto) {
        return this.communicationService.completeWhatsAppEmbeddedSignup(clinicId, dto.code, dto.accessToken, dto.phoneNumberId, dto.wabaId);
    }
    async disconnectWhatsApp(clinicId) {
        return this.communicationService.disconnectWhatsApp(clinicId);
    }
    async getInboxConversations(clinicId, page, limit) {
        return this.communicationService.getInboxConversations(clinicId, page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 30);
    }
    async getConversationMessages(clinicId, phone, page, limit) {
        return this.communicationService.getConversationMessages(clinicId, phone, page ? parseInt(page, 10) : 1, limit ? parseInt(limit, 10) : 50);
    }
    async sendInboxReply(clinicId, phone, body) {
        if (!body.message?.trim())
            throw new common_1.BadRequestException('message is required');
        return this.communicationService.sendInboxReply(clinicId, phone, body.message.trim());
    }
    async startConversation(clinicId, body) {
        if (!body.patient_id)
            throw new common_1.BadRequestException('patient_id is required');
        if (!body.template_id)
            throw new common_1.BadRequestException('template_id is required');
        return this.communicationService.sendMessage(clinicId, {
            patient_id: body.patient_id,
            channel: send_message_dto_js_1.MessageChannel.WHATSAPP,
            category: send_message_dto_js_1.MessageCategory.TRANSACTIONAL,
            template_id: body.template_id,
            variables: body.variables,
        });
    }
};
exports.CommunicationController = CommunicationController;
__decorate([
    (0, common_1.Post)('messages'),
    (0, swagger_1.ApiOperation)({ summary: 'Send a message to a patient' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Message queued for delivery' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, send_message_dto_js_1.SendMessageDto]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "sendMessage", null);
__decorate([
    (0, common_1.Get)('messages'),
    (0, swagger_1.ApiOperation)({ summary: 'List communication messages (with logs)' }),
    (0, swagger_1.ApiOkResponse)({ description: 'Paginated message list' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, query_message_dto_js_1.QueryMessageDto]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "findAllMessages", null);
__decorate([
    (0, common_1.Get)('messages/stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get communication statistics' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)('start_date')),
    __param(2, (0, common_1.Query)('end_date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "getStats", null);
__decorate([
    (0, common_1.Get)('messages/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a message with delivery logs' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('id', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "findOneMessage", null);
__decorate([
    (0, common_1.Get)('circuit-breaker'),
    (0, swagger_1.ApiOperation)({ summary: 'Get circuit breaker status for all channels' }),
    openapi.ApiResponse({ status: 200, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "getCircuitBreakerStatus", null);
__decorate([
    (0, common_1.Get)('patients/:patientId/preferences'),
    (0, swagger_1.ApiOperation)({ summary: 'Get patient communication preferences' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('patientId', common_1.ParseUUIDPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "getPreferences", null);
__decorate([
    (0, common_1.Get)('patients/:patientId/timeline'),
    (0, swagger_1.ApiOperation)({ summary: 'Get patient communication timeline (all messages sent to patient)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('patientId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __param(4, (0, common_1.Query)('channel')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "getPatientTimeline", null);
__decorate([
    (0, common_1.Patch)('patients/:patientId/preferences'),
    (0, swagger_1.ApiOperation)({ summary: 'Update patient communication preferences' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('patientId', common_1.ParseUUIDPipe)),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, update_preferences_dto_js_1.UpdatePreferencesDto, Object]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "updatePreferences", null);
__decorate([
    (0, common_1.Get)('settings'),
    (0, swagger_1.ApiOperation)({ summary: 'Get clinic communication settings' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "getSettings", null);
__decorate([
    (0, common_1.Patch)('settings'),
    (0, swagger_1.ApiOperation)({ summary: 'Update clinic communication settings (enable/disable channels, configure providers)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_clinic_settings_dto_js_1.UpdateClinicSettingsDto]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "updateSettings", null);
__decorate([
    (0, common_1.Get)('ndnc-check/:phone'),
    (0, swagger_1.ApiOperation)({ summary: 'Check if a phone number is on the NDNC (National Do Not Call) registry' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, common_1.Param)('phone')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "ndncCheck", null);
__decorate([
    (0, common_1.Post)('test-email'),
    (0, swagger_1.ApiOperation)({ summary: 'Send a test email to verify SMTP configuration' }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Test email sent' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "sendTestEmail", null);
__decorate([
    (0, common_1.Post)('test-sms'),
    (0, swagger_1.ApiOperation)({
        summary: 'Send a test SMS to verify MSG91/DLT configuration',
        description: 'Uses the SMS template configured via env vars (SMS_OTP_TEMPLATE / SMS_OTP_TEMPLATE_ID). ' +
            'Pass optional "variables" to fill {#var#} placeholders in the template body. ' +
            'To change the template, update the env vars and restart — no code changes needed.',
    }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Test SMS sent' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "sendTestSms", null);
__decorate([
    (0, common_1.Post)('verify-smtp'),
    (0, swagger_1.ApiOperation)({ summary: 'Verify SMTP connectivity without sending an email' }),
    (0, swagger_1.ApiOkResponse)({ description: 'SMTP verification result' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "verifySmtp", null);
__decorate([
    (0, common_1.Post)('whatsapp/templates/sync'),
    (0, swagger_1.ApiOperation)({
        summary: 'Sync WhatsApp templates from Meta — fetches all templates and upserts into local DB',
    }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'Templates synced from Meta' }),
    openapi.ApiResponse({ status: 201, type: Object }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "syncWhatsAppTemplates", null);
__decorate([
    (0, common_1.Post)('whatsapp/templates/submit'),
    (0, swagger_1.ApiOperation)({ summary: 'Submit a WhatsApp message template for Meta approval via Gupshup' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "submitWhatsAppTemplate", null);
__decorate([
    (0, common_1.Get)('whatsapp/templates/:templateName/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Check approval status of a submitted WhatsApp template' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('templateName')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "getWhatsAppTemplateStatus", null);
__decorate([
    (0, common_1.Post)('whatsapp/embedded-signup'),
    (0, swagger_1.ApiOperation)({
        summary: 'Complete WhatsApp Embedded Signup — exchanges Meta auth code for credentials and saves them',
    }),
    (0, swagger_1.ApiCreatedResponse)({ description: 'WhatsApp Business Account connected successfully' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, whatsapp_embedded_signup_dto_js_1.WhatsAppEmbeddedSignupDto]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "completeEmbeddedSignup", null);
__decorate([
    (0, common_1.Post)('whatsapp/disconnect'),
    (0, swagger_1.ApiOperation)({ summary: 'Disconnect WhatsApp Business Account from this clinic' }),
    (0, swagger_1.ApiOkResponse)({ description: 'WhatsApp disconnected' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "disconnectWhatsApp", null);
__decorate([
    (0, common_1.Get)('whatsapp/inbox'),
    (0, require_feature_decorator_js_1.RequireFeature)('WHATSAPP_INBOX'),
    (0, swagger_1.ApiOperation)({ summary: 'List WhatsApp conversations (grouped by contact phone number)' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "getInboxConversations", null);
__decorate([
    (0, common_1.Get)('whatsapp/inbox/:phone'),
    (0, require_feature_decorator_js_1.RequireFeature)('WHATSAPP_INBOX'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all messages in a WhatsApp conversation thread' }),
    openapi.ApiResponse({ status: 200 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('phone')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "getConversationMessages", null);
__decorate([
    (0, common_1.Post)('whatsapp/inbox/:phone/reply'),
    (0, require_feature_decorator_js_1.RequireFeature)('WHATSAPP_INBOX'),
    (0, swagger_1.ApiOperation)({ summary: 'Send a free-form reply within a 24hr session window' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Param)('phone')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "sendInboxReply", null);
__decorate([
    (0, common_1.Post)('whatsapp/inbox/new-conversation'),
    (0, require_feature_decorator_js_1.RequireFeature)('WHATSAPP_INBOX'),
    (0, swagger_1.ApiOperation)({ summary: 'Start a new WhatsApp conversation by sending a template to a patient' }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, current_clinic_decorator_js_1.CurrentClinic)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], CommunicationController.prototype, "startConversation", null);
exports.CommunicationController = CommunicationController = __decorate([
    (0, swagger_1.ApiTags)('Communication'),
    (0, swagger_1.ApiHeader)({ name: 'x-clinic-id', required: true }),
    (0, common_1.UseGuards)(require_clinic_guard_js_1.RequireClinicGuard),
    (0, common_1.Controller)('communication'),
    __metadata("design:paramtypes", [communication_service_js_1.CommunicationService])
], CommunicationController);
//# sourceMappingURL=communication.controller.js.map