"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestQueueModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const queue_names_js_1 = require("../../common/queue/queue-names.js");
const test_queue_controller_js_1 = require("./test-queue.controller.js");
const test_queue_producer_js_1 = require("./test-queue.producer.js");
const test_queue_processor_js_1 = require("./test-queue.processor.js");
let TestQueueModule = class TestQueueModule {
};
exports.TestQueueModule = TestQueueModule;
exports.TestQueueModule = TestQueueModule = __decorate([
    (0, common_1.Module)({
        imports: [bullmq_1.BullModule.registerQueue({ name: queue_names_js_1.QUEUE_NAMES.TEST })],
        controllers: [test_queue_controller_js_1.TestQueueController],
        providers: [test_queue_producer_js_1.TestQueueProducer, test_queue_processor_js_1.TestQueueProcessor],
    })
], TestQueueModule);
//# sourceMappingURL=test-queue.module.js.map