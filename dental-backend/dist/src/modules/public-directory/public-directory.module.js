"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicDirectoryModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const config_1 = require("@nestjs/config");
const public_directory_controller_js_1 = require("./public-directory.controller.js");
const listing_verification_service_js_1 = require("./listing-verification.service.js");
const clinic_reviews_controller_js_1 = require("./clinic-reviews.controller.js");
const review_trigger_service_js_1 = require("./review-trigger.service.js");
const prisma_service_js_1 = require("../../database/prisma.service.js");
const s3_service_js_1 = require("../../common/services/s3.service.js");
const communication_module_js_1 = require("../communication/communication.module.js");
let PublicDirectoryModule = class PublicDirectoryModule {
};
exports.PublicDirectoryModule = PublicDirectoryModule;
exports.PublicDirectoryModule = PublicDirectoryModule = __decorate([
    (0, common_1.Module)({
        imports: [
            communication_module_js_1.CommunicationModule,
            config_1.ConfigModule,
            jwt_1.JwtModule.registerAsync({
                imports: [config_1.ConfigModule],
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    secret: config.get('app.jwtSecret') || config.get('JWT_SECRET') || 'secret',
                    signOptions: { expiresIn: '30m' },
                }),
            }),
        ],
        controllers: [public_directory_controller_js_1.PublicDirectoryController, clinic_reviews_controller_js_1.ClinicReviewsController],
        providers: [prisma_service_js_1.PrismaService, public_directory_controller_js_1.PublicDirectoryController, review_trigger_service_js_1.ReviewTriggerService, s3_service_js_1.S3Service, listing_verification_service_js_1.ListingVerificationService],
        exports: [review_trigger_service_js_1.ReviewTriggerService],
    })
], PublicDirectoryModule);
//# sourceMappingURL=public-directory.module.js.map