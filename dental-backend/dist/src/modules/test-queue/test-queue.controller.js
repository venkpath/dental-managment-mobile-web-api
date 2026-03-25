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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestQueueController = void 0;
const openapi = require("@nestjs/swagger");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const class_validator_1 = require("class-validator");
const public_decorator_js_1 = require("../../common/decorators/public.decorator.js");
const test_queue_producer_js_1 = require("./test-queue.producer.js");
class EnqueueTestJobDto {
    message;
}
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], EnqueueTestJobDto.prototype, "message", void 0);
let TestQueueController = class TestQueueController {
    testQueueProducer;
    constructor(testQueueProducer) {
        this.testQueueProducer = testQueueProducer;
    }
    async enqueueJob(body) {
        return this.testQueueProducer.enqueue(body.message || 'Hello from test queue');
    }
};
exports.TestQueueController = TestQueueController;
__decorate([
    (0, public_decorator_js_1.Public)(),
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Enqueue a test job',
        description: 'Adds a test job to the queue for processing (temporary endpoint)',
    }),
    (0, swagger_1.ApiBody)({
        type: EnqueueTestJobDto,
        examples: {
            default: {
                summary: 'Test job',
                value: { message: 'Hello from test queue' },
            },
        },
    }),
    (0, swagger_1.ApiCreatedResponse)({
        description: 'Job enqueued successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        jobId: { type: 'string', example: '1' },
                    },
                },
                message: { type: 'string', example: 'Request successful' },
            },
        },
    }),
    openapi.ApiResponse({ status: 201 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [EnqueueTestJobDto]),
    __metadata("design:returntype", Promise)
], TestQueueController.prototype, "enqueueJob", null);
exports.TestQueueController = TestQueueController = __decorate([
    (0, swagger_1.ApiTags)('Test Queue'),
    (0, common_1.Controller)('test-queue'),
    __metadata("design:paramtypes", [test_queue_producer_js_1.TestQueueProducer])
], TestQueueController);
//# sourceMappingURL=test-queue.controller.js.map