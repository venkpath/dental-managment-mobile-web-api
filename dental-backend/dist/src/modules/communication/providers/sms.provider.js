"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var SmsProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsProvider = void 0;
const common_1 = require("@nestjs/common");
let SmsProvider = SmsProvider_1 = class SmsProvider {
    channel = 'sms';
    logger = new common_1.Logger(SmsProvider_1.name);
    clinicConfigs = new Map();
    configure(clinicId, config, providerName) {
        this.clinicConfigs.set(clinicId, { config, providerName });
        this.logger.log(`SMS provider configured for clinic ${clinicId}: ${providerName} (sender=${config.senderId})`);
    }
    getProviderName(clinicId) {
        return this.clinicConfigs.get(clinicId)?.providerName || 'disabled';
    }
    isConfigured(clinicId) {
        return this.clinicConfigs.has(clinicId);
    }
    removeClinic(clinicId) {
        this.clinicConfigs.delete(clinicId);
    }
    async send(options) {
        const clinicId = options.clinicId || '';
        const ctx = this.clinicConfigs.get(clinicId);
        if (!ctx) {
            this.logger.warn(`SMS provider not configured for clinic ${clinicId} — message not sent`);
            return {
                success: false,
                error: 'SMS provider not configured. Enable SMS in clinic communication settings and provide API credentials.',
            };
        }
        const isUnicode = /[^\x00-\x7F]/.test(options.body);
        const maxLength = isUnicode ? 70 : 160;
        if (options.body.length > maxLength) {
            this.logger.warn(`SMS body exceeds ${maxLength} chars (${options.body.length}). ` +
                `Message will be split by provider.`);
        }
        try {
            const { config, providerName } = ctx;
            const phone = options.to.replace(/[^0-9+]/g, '');
            const mobileNumber = phone.replace(/^\+91/, '').replace(/^\+/, '');
            this.logger.debug(`[SMS ${providerName}] Sending to: ${phone} | DLT: ${options.templateId || 'none'} | Length: ${options.body.length}`);
            if (!options.templateId) {
                this.logger.warn(`SMS send skipped to ${phone}: DLT template ID is required. Assign a template with a DLT ID to the automation rule.`);
                return {
                    success: false,
                    error: 'DLT template ID is required for SMS in India. Assign a message template with a DLT Template ID.',
                };
            }
            if (options.variables) {
                const flowPayload = {
                    flow_id: options.templateId,
                    sender: config.senderId,
                    mobiles: mobileNumber,
                    ...options.variables,
                };
                this.logger.debug(`[SMS ${providerName}] Flow payload: ${JSON.stringify(flowPayload)}`);
                const flowRes = await fetch('https://control.msg91.com/api/v5/flow/', {
                    method: 'POST',
                    headers: {
                        'authkey': config.apiKey,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(flowPayload),
                });
                const flowRaw = await flowRes.text();
                this.logger.debug(`[SMS ${providerName}] Flow response (${flowRes.status}): ${flowRaw}`);
                let flowData;
                try {
                    flowData = JSON.parse(flowRaw);
                }
                catch (_e) {
                    return { success: false, error: `MSG91 flow returned non-JSON (${flowRes.status}): ${flowRaw.slice(0, 200)}` };
                }
                const flowMsg = (flowData.message ?? flowData.msg ?? flowRaw);
                if (flowData.type === 'success') {
                    this.logger.log(`SMS sent via flow to ${phone}: ${flowMsg}`);
                    return { success: true, providerMessageId: (flowData.request_id || flowMsg) };
                }
                else {
                    this.logger.warn(`SMS flow failed to ${phone}: ${flowMsg}`);
                    return { success: false, error: flowMsg };
                }
            }
            const payload = {
                sender: config.senderId,
                route: config.route === 'promotional' ? '1' : '4',
                country: '91',
                DLT_TE_ID: options.templateId,
                ...(config.dltEntityId && { pe_id: config.dltEntityId }),
                sms: [
                    {
                        message: options.body,
                        to: [mobileNumber],
                    },
                ],
            };
            this.logger.debug(`[SMS ${providerName}] Payload: ${JSON.stringify(payload)}`);
            const response = await fetch('https://control.msg91.com/api/v5/sms/send', {
                method: 'POST',
                headers: {
                    'authkey': config.apiKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            const rawText = await response.text();
            this.logger.debug(`[SMS ${providerName}] MSG91 response (${response.status}): ${rawText}`);
            let data;
            try {
                data = JSON.parse(rawText);
            }
            catch {
                if (response.ok) {
                    return { success: true, providerMessageId: rawText };
                }
                return { success: false, error: `MSG91 error (${response.status}): ${rawText.slice(0, 200)}` };
            }
            const isSuccess = data.type === 'success' || (response.ok && data.request_id);
            const msg = (data.message ?? data.msg ?? data.error ?? rawText);
            if (isSuccess) {
                this.logger.log(`SMS sent to ${phone}: ${msg}`);
                return { success: true, providerMessageId: (data.request_id || msg) };
            }
            else {
                this.logger.warn(`SMS send failed to ${phone}: ${msg}`);
                return { success: false, error: msg };
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown SMS error';
            this.logger.error(`SMS send failed to ${options.to}: ${message}`);
            return {
                success: false,
                error: message,
            };
        }
    }
};
exports.SmsProvider = SmsProvider;
exports.SmsProvider = SmsProvider = SmsProvider_1 = __decorate([
    (0, common_1.Injectable)()
], SmsProvider);
//# sourceMappingURL=sms.provider.js.map