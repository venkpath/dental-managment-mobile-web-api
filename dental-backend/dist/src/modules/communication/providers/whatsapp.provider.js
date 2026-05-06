"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var WhatsAppProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppProvider = void 0;
const common_1 = require("@nestjs/common");
const META_GRAPH_API = 'https://graph.facebook.com/v21.0';
let WhatsAppProvider = WhatsAppProvider_1 = class WhatsAppProvider {
    channel = 'whatsapp';
    logger = new common_1.Logger(WhatsAppProvider_1.name);
    clinicConfigs = new Map();
    configure(clinicId, config, providerName) {
        const existing = this.clinicConfigs.get(clinicId);
        this.clinicConfigs.set(clinicId, {
            config,
            providerName,
            sessionWindows: existing?.sessionWindows || new Map(),
        });
        this.logger.log(`WhatsApp provider configured for clinic ${clinicId}: ${providerName} (Meta Cloud API)`);
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
    trackIncomingMessage(clinicId, phone) {
        const ctx = this.clinicConfigs.get(clinicId);
        if (ctx) {
            ctx.sessionWindows.set(phone, Date.now());
        }
    }
    isSessionOpen(clinicId, phone) {
        const ctx = this.clinicConfigs.get(clinicId);
        if (!ctx)
            return false;
        const lastMessage = ctx.sessionWindows.get(phone);
        if (!lastMessage)
            return false;
        const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
        return (Date.now() - lastMessage) < TWENTY_FOUR_HOURS;
    }
    async send(options) {
        const clinicId = options.clinicId || '';
        const ctx = this.clinicConfigs.get(clinicId);
        if (!ctx) {
            this.logger.warn(`WhatsApp provider not configured for clinic ${clinicId} — message not sent`);
            return {
                success: false,
                error: 'WhatsApp provider not configured. Enable WhatsApp in clinic communication settings and provide Meta API credentials.',
            };
        }
        try {
            const { config } = ctx;
            let destination;
            if (options.to.startsWith('+')) {
                destination = options.to.slice(1);
            }
            else {
                destination = options.to.replace(/[^0-9]/g, '');
                if (destination.length === 10) {
                    destination = '91' + destination;
                }
                else if (destination.length === 11 && destination.startsWith('0')) {
                    destination = '91' + destination.slice(1);
                }
            }
            const interactiveButtons = options.metadata?.['interactive_buttons'];
            const mediaOptions = options.metadata?.['media'];
            let messagePayload;
            if (mediaOptions) {
                messagePayload = this.buildMediaPayload(destination, mediaOptions, options.body);
            }
            else if (interactiveButtons && interactiveButtons.length > 0) {
                messagePayload = this.buildInteractivePayload(destination, options.body, interactiveButtons);
            }
            else if (options.templateId) {
                const buttonParams = options.metadata?.['whatsapp_button_params'];
                const headerMedia = options.metadata?.['whatsapp_header_media'];
                messagePayload = this.buildTemplatePayload(destination, options.templateId, options.variables, options.language, buttonParams, headerMedia);
            }
            else {
                const sessionOpen = this.isSessionOpen(clinicId, destination);
                if (!sessionOpen) {
                    this.logger.warn(`WhatsApp session expired for ${destination}. Use a template message or wait for patient to respond.`);
                }
                messagePayload = this.buildTextPayload(destination, options.body);
            }
            this.logger.log(`[WhatsApp Meta] Sending to ${destination}: ${JSON.stringify(messagePayload).substring(0, 800)}`);
            const url = `${META_GRAPH_API}/${config.phoneNumberId}/messages`;
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(messagePayload),
                signal: AbortSignal.timeout(15000),
            });
            const data = await response.json();
            this.logger.log(`[WhatsApp Meta] Response (${response.status}): ${JSON.stringify(data).substring(0, 500)}`);
            if (response.ok && data.messages) {
                const messages = data.messages;
                const msgId = messages[0]?.id || '';
                this.logger.log(`WhatsApp sent to ${destination}: ${msgId}`);
                return { success: true, providerMessageId: msgId };
            }
            else {
                const error = data.error;
                const errorMsg = (error?.message || 'Meta API error');
                this.logger.warn(`WhatsApp send failed to ${destination}: ${errorMsg}`);
                return { success: false, error: errorMsg };
            }
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown WhatsApp error';
            this.logger.error(`WhatsApp send failed to ${options.to}: ${message}`);
            return { success: false, error: message };
        }
    }
    async submitTemplate(clinicId, templateData) {
        const ctx = this.clinicConfigs.get(clinicId);
        if (!ctx) {
            return { success: false, error: 'WhatsApp not configured for this clinic' };
        }
        const { config } = ctx;
        if (!config.wabaId) {
            return { success: false, error: 'WABA ID is required for template management. Set it in your WhatsApp config.' };
        }
        try {
            const varOrder = [];
            const metaBody = this.convertToNumberedVars(templateData.body, varOrder);
            const suppliedSamples = templateData.variableSamples || [];
            const bodySamples = varOrder.map((_, idx) => suppliedSamples[idx] || `value${idx + 1}`);
            const headerVarsBefore = varOrder.length;
            const metaHeader = templateData.header ? this.convertToNumberedVars(templateData.header, varOrder) : undefined;
            const headerSamples = varOrder.slice(headerVarsBefore).map((_, idx) => suppliedSamples[headerVarsBefore + idx] || `value${headerVarsBefore + idx + 1}`);
            const components = [];
            if (metaHeader) {
                const headerComponent = { type: 'HEADER', format: 'TEXT', text: metaHeader };
                if (headerSamples.length > 0) {
                    headerComponent.example = { header_text: headerSamples };
                }
                components.push(headerComponent);
            }
            const bodyComponent = { type: 'BODY', text: metaBody };
            if (bodySamples.length > 0) {
                bodyComponent.example = { body_text: [bodySamples] };
            }
            components.push(bodyComponent);
            if (templateData.footer) {
                components.push({ type: 'FOOTER', text: templateData.footer });
            }
            const response = await fetch(`${META_GRAPH_API}/${config.wabaId}/message_templates`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json',
                },
                signal: AbortSignal.timeout(15000),
                body: JSON.stringify({
                    name: templateData.elementName,
                    language: templateData.languageCode,
                    category: templateData.category.toUpperCase(),
                    components,
                }),
            });
            const data = await response.json();
            if (response.ok && data.id) {
                return { success: true, templateId: data.id };
            }
            const error = data.error;
            return { success: false, error: (error?.message || 'Template submission failed') };
        }
        catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    async fetchAllTemplates(clinicId) {
        const ctx = this.clinicConfigs.get(clinicId);
        if (!ctx)
            return { success: false, error: 'WhatsApp not configured for this clinic' };
        const { config } = ctx;
        if (!config.wabaId)
            return { success: false, error: 'WABA ID is required for template management' };
        try {
            const allTemplates = [];
            let url = `${META_GRAPH_API}/${config.wabaId}/message_templates?limit=100&fields=name,language,status,category,components,rejected_reason`;
            while (url) {
                const response = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${config.accessToken}` },
                    signal: AbortSignal.timeout(15000),
                });
                const data = await response.json();
                if (!response.ok) {
                    const error = data.error;
                    return { success: false, error: (error?.message || 'Failed to fetch templates') };
                }
                const templates = (data.data || []);
                for (const t of templates) {
                    allTemplates.push({
                        name: t.name,
                        language: t.language || 'en',
                        status: t.status || 'unknown',
                        category: t.category || 'UTILITY',
                        components: t.components || [],
                        id: t.id,
                        rejectedReason: t.rejected_reason,
                    });
                }
                const paging = data.paging;
                url = paging?.next || null;
            }
            this.logger.log(`Fetched ${allTemplates.length} WhatsApp templates for clinic ${clinicId}`);
            return { success: true, templates: allTemplates };
        }
        catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    async getTemplateStatus(clinicId, templateName) {
        const ctx = this.clinicConfigs.get(clinicId);
        if (!ctx)
            return { status: 'not_configured' };
        const { config } = ctx;
        if (!config.wabaId)
            return { status: 'waba_id_required' };
        try {
            const response = await fetch(`${META_GRAPH_API}/${config.wabaId}/message_templates?name=${encodeURIComponent(templateName)}`, {
                headers: { 'Authorization': `Bearer ${config.accessToken}` },
                signal: AbortSignal.timeout(15000),
            });
            const data = await response.json();
            const templates = (data.data || []);
            const template = templates.find(t => t.name === templateName);
            if (!template)
                return { status: 'not_found' };
            return {
                status: template.status || 'unknown',
                rejectedReason: template.rejected_reason,
            };
        }
        catch {
            return { status: 'error' };
        }
    }
    async deleteTemplateFromMeta(clinicId, templateName) {
        const ctx = this.clinicConfigs.get(clinicId);
        if (!ctx)
            return { success: false, error: 'WhatsApp not configured for this clinic' };
        const { config } = ctx;
        if (!config.wabaId)
            return { success: false, error: 'WABA ID is required for template management' };
        try {
            const response = await fetch(`${META_GRAPH_API}/${config.wabaId}/message_templates?name=${encodeURIComponent(templateName)}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${config.accessToken}` },
                signal: AbortSignal.timeout(15000),
            });
            const data = await response.json();
            if (response.ok && data.success) {
                return { success: true };
            }
            const error = data.error;
            return { success: false, error: (error?.message || 'Template deletion failed') };
        }
        catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    async editTemplateOnMeta(clinicId, metaTemplateId, templateData) {
        const ctx = this.clinicConfigs.get(clinicId);
        if (!ctx)
            return { success: false, error: 'WhatsApp not configured for this clinic' };
        const { config } = ctx;
        try {
            const varOrder = [];
            const components = [];
            if (templateData.header) {
                components.push({ type: 'HEADER', format: 'TEXT', text: this.convertToNumberedVars(templateData.header, varOrder) });
            }
            components.push({ type: 'BODY', text: this.convertToNumberedVars(templateData.body, varOrder) });
            if (templateData.footer) {
                components.push({ type: 'FOOTER', text: templateData.footer });
            }
            const payload = { components };
            if (templateData.category) {
                payload.category = templateData.category.toUpperCase();
            }
            const response = await fetch(`${META_GRAPH_API}/${metaTemplateId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(15000),
            });
            const data = await response.json();
            if (response.ok && data.success) {
                return { success: true };
            }
            const error = data.error;
            return { success: false, error: (error?.message || 'Template edit failed') };
        }
        catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    }
    convertToNumberedVars(text, varOrder) {
        return text.replace(/\{\{(\w+)\}\}/g, (_, name) => {
            let idx = varOrder.indexOf(name);
            if (idx === -1) {
                varOrder.push(name);
                idx = varOrder.length - 1;
            }
            return `{{${idx + 1}}}`;
        });
    }
    buildTextPayload(destination, body) {
        return {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: destination,
            type: 'text',
            text: { preview_url: false, body },
        };
    }
    buildTemplatePayload(destination, templateName, variables, language, buttonParams, headerMedia) {
        const components = [];
        if (headerMedia?.url) {
            const param = { type: headerMedia.type };
            if (headerMedia.type === 'document') {
                param.document = { link: headerMedia.url, filename: headerMedia.filename || 'document.pdf' };
            }
            else if (headerMedia.type === 'image') {
                param.image = { link: headerMedia.url };
            }
            else if (headerMedia.type === 'video') {
                param.video = { link: headerMedia.url };
            }
            components.push({
                type: 'header',
                parameters: [param],
            });
        }
        if (variables && Object.keys(variables).length > 0) {
            const sortedValues = Object.entries(variables)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([, value]) => value);
            this.logger.debug(`[WhatsApp Template] ${templateName}: ${sortedValues.length} body params, lang=${language || 'en'}`);
            components.push({
                type: 'body',
                parameters: sortedValues.map(value => ({
                    type: 'text',
                    text: value,
                })),
            });
        }
        if (buttonParams && buttonParams.length > 0) {
            for (const btn of buttonParams) {
                components.push({
                    type: 'button',
                    sub_type: btn.type,
                    index: String(btn.index),
                    parameters: btn.parameters.map(value => ({
                        type: 'text',
                        text: value,
                    })),
                });
            }
            this.logger.debug(`[WhatsApp Template] ${templateName}: ${buttonParams.length} button params`);
        }
        return {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: destination,
            type: 'template',
            template: {
                name: templateName,
                language: { code: language || 'en' },
                components: components.length > 0 ? components : undefined,
            },
        };
    }
    buildInteractivePayload(destination, body, buttons) {
        return {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: destination,
            type: 'interactive',
            interactive: {
                type: 'button',
                body: { text: body },
                action: {
                    buttons: buttons.slice(0, 3).map((btn, idx) => ({
                        type: 'reply',
                        reply: {
                            id: btn.id || `btn_${idx}`,
                            title: btn.title.substring(0, 20),
                        },
                    })),
                },
            },
        };
    }
    buildMediaPayload(destination, media, caption) {
        const base = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: destination,
        };
        switch (media.type) {
            case 'image':
                return {
                    ...base,
                    type: 'image',
                    image: { link: media.url, caption: caption || media.caption || '' },
                };
            case 'document':
                return {
                    ...base,
                    type: 'document',
                    document: {
                        link: media.url,
                        caption: caption || media.caption || '',
                        filename: media.filename || 'document.pdf',
                    },
                };
            case 'video':
                return {
                    ...base,
                    type: 'video',
                    video: { link: media.url, caption: caption || media.caption || '' },
                };
            case 'audio':
                return {
                    ...base,
                    type: 'audio',
                    audio: { link: media.url },
                };
            case 'location':
                return {
                    ...base,
                    type: 'location',
                    location: {
                        longitude: media.longitude,
                        latitude: media.latitude,
                        name: media.name || '',
                        address: media.address || '',
                    },
                };
            default:
                return { ...base, type: 'text', text: { body: caption || '' } };
        }
    }
    async sendFreeText(clinicId, to, body) {
        const ctx = this.clinicConfigs.get(clinicId);
        if (!ctx) {
            return { success: false, error: 'WhatsApp not configured for this clinic' };
        }
        let destination;
        if (to.startsWith('+')) {
            destination = to.slice(1);
        }
        else {
            destination = to.replace(/[^0-9]/g, '');
            if (destination.length === 10) {
                destination = '91' + destination;
            }
            else if (destination.length === 11 && destination.startsWith('0')) {
                destination = '91' + destination.slice(1);
            }
        }
        const payload = {
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: destination,
            type: 'text',
            text: { body, preview_url: false },
        };
        try {
            const response = await fetch(`${META_GRAPH_API}/${ctx.config.phoneNumberId}/messages`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${ctx.config.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
                signal: AbortSignal.timeout(15000),
            });
            const json = await response.json();
            if (!response.ok) {
                const error = json['error']?.['message'] || 'Send failed';
                return { success: false, error };
            }
            const messages = json['messages'];
            const messageId = messages?.[0]?.['id'];
            return { success: true, messageId };
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : 'Unknown error';
            return { success: false, error: msg };
        }
    }
};
exports.WhatsAppProvider = WhatsAppProvider;
exports.WhatsAppProvider = WhatsAppProvider = WhatsAppProvider_1 = __decorate([
    (0, common_1.Injectable)()
], WhatsAppProvider);
//# sourceMappingURL=whatsapp.provider.js.map