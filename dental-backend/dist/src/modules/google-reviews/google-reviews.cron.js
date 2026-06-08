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
var GoogleReviewsCronService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleReviewsCronService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const google_reviews_service_js_1 = require("./google-reviews.service.js");
let GoogleReviewsCronService = GoogleReviewsCronService_1 = class GoogleReviewsCronService {
    googleReviews;
    logger = new common_1.Logger(GoogleReviewsCronService_1.name);
    constructor(googleReviews) {
        this.googleReviews = googleReviews;
    }
    async pollAllClinics() {
        this.logger.log('[GoogleReviewsCron] Starting hourly review sync...');
        const start = Date.now();
        try {
            const result = await this.googleReviews.syncAllClinics();
            const elapsed = Date.now() - start;
            this.logger.log(`[GoogleReviewsCron] Sync complete in ${elapsed}ms — ` +
                `clinics=${result.clinicsProcessed} ` +
                `synced=${result.reviewsSynced} ` +
                `posted=${result.repliesPosted} ` +
                `queued=${result.queuedForApproval}`);
        }
        catch (err) {
            this.logger.error(`[GoogleReviewsCron] Top-level sync failed: ${err.message}`, err.stack);
        }
    }
};
exports.GoogleReviewsCronService = GoogleReviewsCronService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GoogleReviewsCronService.prototype, "pollAllClinics", null);
exports.GoogleReviewsCronService = GoogleReviewsCronService = GoogleReviewsCronService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [google_reviews_service_js_1.GoogleReviewsService])
], GoogleReviewsCronService);
//# sourceMappingURL=google-reviews.cron.js.map