"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var TestQueueProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestQueueProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const queue_names_js_1 = require("../../common/queue/queue-names.js");
let TestQueueProcessor = TestQueueProcessor_1 = class TestQueueProcessor extends bullmq_1.WorkerHost {
    logger = new common_1.Logger(TestQueueProcessor_1.name);
    async process(job) {
        this.logger.log(`Processing job ${job.id}: ${job.data.message}`);
        this.logger.log(`Job enqueued at: ${job.data.timestamp}`);
        this.logger.log(`Job ${job.id} completed successfully`);
    }
};
exports.TestQueueProcessor = TestQueueProcessor;
exports.TestQueueProcessor = TestQueueProcessor = TestQueueProcessor_1 = __decorate([
    (0, bullmq_1.Processor)(queue_names_js_1.QUEUE_NAMES.TEST)
], TestQueueProcessor);
//# sourceMappingURL=test-queue.processor.js.map