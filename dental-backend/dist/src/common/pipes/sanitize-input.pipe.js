"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SanitizeInputPipe = void 0;
const common_1 = require("@nestjs/common");
const sanitize_html_1 = __importDefault(require("sanitize-html"));
let SanitizeInputPipe = class SanitizeInputPipe {
    sanitizeOptions = {
        allowedTags: [],
        allowedAttributes: {},
        disallowedTagsMode: 'discard',
    };
    transform(value, metadata) {
        if (metadata.type !== 'body')
            return value;
        if (value === null || value === undefined)
            return value;
        return this.sanitizeValue(value);
    }
    sanitizeValue(value) {
        if (typeof value === 'string') {
            return (0, sanitize_html_1.default)(value, this.sanitizeOptions);
        }
        if (Array.isArray(value)) {
            return value.map((item) => this.sanitizeValue(item));
        }
        if (value !== null && typeof value === 'object') {
            const sanitized = {};
            for (const [key, val] of Object.entries(value)) {
                sanitized[key] = this.sanitizeValue(val);
            }
            return sanitized;
        }
        return value;
    }
};
exports.SanitizeInputPipe = SanitizeInputPipe;
exports.SanitizeInputPipe = SanitizeInputPipe = __decorate([
    (0, common_1.Injectable)()
], SanitizeInputPipe);
//# sourceMappingURL=sanitize-input.pipe.js.map