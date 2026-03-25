"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var EmailProvider_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailProvider = void 0;
const common_1 = require("@nestjs/common");
const nodemailer = __importStar(require("nodemailer"));
let EmailProvider = EmailProvider_1 = class EmailProvider {
    channel = 'email';
    logger = new common_1.Logger(EmailProvider_1.name);
    clinicTransporters = new Map();
    configure(clinicId, config, providerName) {
        const port = config.port;
        const secure = config.secure ?? port === 465;
        const transporter = nodemailer.createTransport({
            host: config.host,
            port,
            secure,
            auth: {
                user: config.user,
                pass: config.pass,
            },
            connectionTimeout: 30_000,
            greetingTimeout: 30_000,
            socketTimeout: 60_000,
            ...(!secure && {
                tls: { rejectUnauthorized: false },
            }),
        });
        this.clinicTransporters.set(clinicId, { transporter, providerName, from: config.from || config.user });
        this.logger.log(`Email provider configured for clinic ${clinicId}: ${providerName} (${config.host}:${port}, secure=${secure})`);
    }
    async verify(clinicId) {
        const ctx = this.clinicTransporters.get(clinicId);
        if (!ctx)
            return { ok: false, error: 'Email provider not configured for this clinic' };
        try {
            await ctx.transporter.verify();
            return { ok: true };
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            this.logger.warn(`SMTP verify failed for clinic ${clinicId}: ${message}`);
            return { ok: false, error: message };
        }
    }
    getProviderName(clinicId) {
        return this.clinicTransporters.get(clinicId)?.providerName || 'disabled';
    }
    isConfigured(clinicId) {
        return this.clinicTransporters.has(clinicId);
    }
    removeClinic(clinicId) {
        this.clinicTransporters.delete(clinicId);
    }
    async send(options) {
        const clinicId = options.clinicId || '';
        const ctx = this.clinicTransporters.get(clinicId);
        if (!ctx) {
            this.logger.warn(`Email provider not configured for clinic ${clinicId} — message not sent`);
            return {
                success: false,
                error: 'Email provider not configured. Enable email in clinic communication settings.',
            };
        }
        try {
            const info = await ctx.transporter.sendMail({
                from: options.metadata?.['from'] || ctx.from || process.env['EMAIL_FROM'] || 'noreply@smartdentaldesk.com',
                to: options.to,
                subject: options.subject || 'Notification',
                text: options.body,
                html: options.html || options.body,
            });
            this.logger.debug(`Email sent to ${options.to}: ${info.messageId}`);
            return {
                success: true,
                providerMessageId: info.messageId,
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown email error';
            this.logger.error(`Email send failed to ${options.to}: ${message}`);
            return {
                success: false,
                error: message,
            };
        }
    }
};
exports.EmailProvider = EmailProvider;
exports.EmailProvider = EmailProvider = EmailProvider_1 = __decorate([
    (0, common_1.Injectable)()
], EmailProvider);
//# sourceMappingURL=email.provider.js.map