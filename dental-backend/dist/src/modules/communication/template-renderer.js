"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var TemplateRenderer_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateRenderer = void 0;
const common_1 = require("@nestjs/common");
let TemplateRenderer = TemplateRenderer_1 = class TemplateRenderer {
    logger = new common_1.Logger(TemplateRenderer_1.name);
    render(template, variables) {
        let result = template;
        result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match, varName, content) => {
            const value = variables[varName];
            return value ? content : '';
        });
        result = result.replace(/\{\{\s*(\w+)\s*\|\s*(\w+)\s*:\s*"([^"]+)"\s*\}\}/g, (_match, varName, formatter, arg) => {
            const value = variables[varName];
            if (value === undefined || value === null)
                return '';
            return this.applyFormatter(value, formatter, arg);
        });
        result = result.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, varName) => {
            const value = variables[varName];
            if (value === undefined || value === null)
                return '';
            return String(value);
        });
        return result;
    }
    extractVariables(template) {
        const vars = new Set();
        const simpleRegex = /\{\{\s*(\w+)\s*\}\}/g;
        let match;
        while ((match = simpleRegex.exec(template)) !== null) {
            vars.add(match[1]);
        }
        const formattedRegex = /\{\{\s*(\w+)\s*\|/g;
        while ((match = formattedRegex.exec(template)) !== null) {
            vars.add(match[1]);
        }
        const conditionalRegex = /\{\{#if\s+(\w+)\}\}/g;
        while ((match = conditionalRegex.exec(template)) !== null) {
            vars.add(match[1]);
        }
        return Array.from(vars);
    }
    applyFormatter(value, formatter, arg) {
        switch (formatter) {
            case 'currency':
                return this.formatCurrency(Number(value), arg);
            case 'format':
                return this.formatDate(String(value), arg);
            default:
                this.logger.warn(`Unknown formatter: ${formatter}`);
                return String(value);
        }
    }
    formatCurrency(amount, currency) {
        if (currency === 'INR') {
            return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
        }
        return `${currency} ${amount.toFixed(2)}`;
    }
    formatDate(dateStr, pattern) {
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime()))
                return dateStr;
            const months = [
                'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
            ];
            const fullMonths = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December',
            ];
            const day = date.getDate();
            const month = date.getMonth();
            const year = date.getFullYear();
            let result = pattern;
            result = result.replace('DD', String(day).padStart(2, '0'));
            result = result.replace('D', String(day));
            result = result.replace('MMMM', fullMonths[month]);
            result = result.replace('MMM', months[month]);
            result = result.replace('MM', String(month + 1).padStart(2, '0'));
            result = result.replace('YYYY', String(year));
            result = result.replace('YY', String(year).slice(-2));
            return result;
        }
        catch {
            return dateStr;
        }
    }
};
exports.TemplateRenderer = TemplateRenderer;
exports.TemplateRenderer = TemplateRenderer = TemplateRenderer_1 = __decorate([
    (0, common_1.Injectable)()
], TemplateRenderer);
//# sourceMappingURL=template-renderer.js.map