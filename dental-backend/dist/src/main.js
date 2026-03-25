"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const sentry_config_js_1 = require("./config/sentry.config.js");
const env_validation_js_1 = require("./config/env-validation.js");
const app_module_js_1 = require("./app.module.js");
const http_exception_filter_js_1 = require("./common/filters/http-exception.filter.js");
const sanitize_input_pipe_js_1 = require("./common/pipes/sanitize-input.pipe.js");
const response_interceptor_js_1 = require("./common/interceptors/response.interceptor.js");
const audit_log_interceptor_js_1 = require("./common/interceptors/audit-log.interceptor.js");
const audit_log_service_js_1 = require("./modules/audit-log/audit-log.service.js");
const swagger_config_js_1 = require("./config/swagger.config.js");
const nestjs_pino_1 = require("nestjs-pino");
(0, sentry_config_js_1.initSentry)();
(0, env_validation_js_1.validateEnvVars)();
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_js_1.AppModule, { bufferLogs: true });
    app.useLogger(app.get(nestjs_pino_1.Logger));
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                imgSrc: ["'self'", 'data:', 'https:'],
                connectSrc: ["'self'"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                frameAncestors: ["'none'"],
            },
        },
        crossOriginEmbedderPolicy: false,
    }));
    app.use((0, cookie_parser_1.default)());
    app.enableCors({
        origin: process.env['CORS_ORIGIN']
            ? process.env['CORS_ORIGIN'].split(',')
            : 'http://localhost:3001',
        credentials: true,
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    });
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new sanitize_input_pipe_js_1.SanitizeInputPipe(), new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.useGlobalFilters(new http_exception_filter_js_1.GlobalExceptionFilter());
    const auditLogService = app.get(audit_log_service_js_1.AuditLogService);
    app.useGlobalInterceptors(new audit_log_interceptor_js_1.AuditLogInterceptor(auditLogService), new response_interceptor_js_1.ResponseInterceptor());
    (0, swagger_config_js_1.setupSwagger)(app);
    const port = process.env['PORT'] || 3000;
    await app.listen(port);
}
void bootstrap();
//# sourceMappingURL=main.js.map