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
var PushNotificationService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PushNotificationService = void 0;
const common_1 = require("@nestjs/common");
const push_device_service_js_1 = require("./push-device.service.js");
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
let PushNotificationService = PushNotificationService_1 = class PushNotificationService {
    pushDeviceService;
    logger = new common_1.Logger(PushNotificationService_1.name);
    constructor(pushDeviceService) {
        this.pushDeviceService = pushDeviceService;
    }
    async sendToUser(userId, payload) {
        const tokens = await this.pushDeviceService.getTokensForUser(userId);
        if (tokens.length === 0)
            return;
        const messages = tokens.map((to) => ({
            to,
            title: payload.title,
            body: payload.body,
            data: payload.data ?? {},
            sound: 'default',
            priority: 'high',
            channelId: 'appointments',
        }));
        try {
            const res = await fetch(EXPO_PUSH_URL, {
                method: 'POST',
                headers: {
                    Accept: 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(messages),
            });
            if (!res.ok) {
                const text = await res.text();
                this.logger.warn(`Expo push HTTP ${res.status} for user ${userId}: ${text}`);
                return;
            }
            const result = (await res.json());
            const tickets = result.data ?? [];
            for (let i = 0; i < tickets.length; i++) {
                const ticket = tickets[i];
                if (ticket?.status === 'error') {
                    this.logger.warn(`Expo push error for user ${userId} token[${i}]: ${ticket.message ?? 'unknown'}`);
                }
            }
        }
        catch (e) {
            this.logger.warn(`Expo push failed for user ${userId}: ${e.message}`);
        }
    }
    async sendToUsers(userIds, payload) {
        const unique = [...new Set(userIds)];
        await Promise.all(unique.map((id) => this.sendToUser(id, payload)));
    }
};
exports.PushNotificationService = PushNotificationService;
exports.PushNotificationService = PushNotificationService = PushNotificationService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [push_device_service_js_1.PushDeviceService])
], PushNotificationService);
//# sourceMappingURL=push-notification.service.js.map