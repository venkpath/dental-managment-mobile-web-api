import { Injectable, Logger } from '@nestjs/common';

export interface TemplateVariables {
  [key: string]: string | number | boolean | undefined | null;
}

@Injectable()
export class TemplateRenderer {
  private readonly logger = new Logger(TemplateRenderer.name);

  /**
   * Render a template body by replacing {{placeholders}} with variable values.
   * Supports:
   *   - Simple: {{patient_name}}
   *   - Formatted: {{amount | currency:"INR"}}
   *   - Date: {{appointment_date | format:"DD MMM YYYY"}}
   *   - Conditional: {{#if has_pending_treatment}}...{{/if}}
   *   - Missing variables are replaced with empty string
   */
  render(template: string, variables: TemplateVariables): string {
    let result = template;

    // 1. Handle conditional blocks: {{#if var}}content{{/if}}
    result = result.replace(
      /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
      (_match, varName: string, content: string) => {
        const value = variables[varName];
        return value ? content : '';
      },
    );

    // 2. Handle formatted placeholders: {{var | format:"pattern"}} or {{var | currency:"INR"}}
    result = result.replace(
      /\{\{\s*(\w+)\s*\|\s*(\w+)\s*:\s*"([^"]+)"\s*\}\}/g,
      (_match, varName: string, formatter: string, arg: string) => {
        const value = variables[varName];
        if (value === undefined || value === null) return '';
        return this.applyFormatter(value, formatter, arg);
      },
    );

    // 3. Handle simple placeholders: {{variable_name}}
    result = result.replace(
      /\{\{\s*(\w+)\s*\}\}/g,
      (_match, varName: string) => {
        const value = variables[varName];
        if (value === undefined || value === null) return '';
        return String(value);
      },
    );

    return result;
  }

  /**
   * Extract all variable names used in a template
   */
  extractVariables(template: string): string[] {
    const vars = new Set<string>();

    // Simple variables
    const simpleRegex = /\{\{\s*(\w+)\s*\}\}/g;
    let match: RegExpExecArray | null;
    while ((match = simpleRegex.exec(template)) !== null) {
      vars.add(match[1]);
    }

    // Formatted variables
    const formattedRegex = /\{\{\s*(\w+)\s*\|/g;
    while ((match = formattedRegex.exec(template)) !== null) {
      vars.add(match[1]);
    }

    // Conditional variables
    const conditionalRegex = /\{\{#if\s+(\w+)\}\}/g;
    while ((match = conditionalRegex.exec(template)) !== null) {
      vars.add(match[1]);
    }

    return Array.from(vars);
  }

  private applyFormatter(
    value: string | number | boolean,
    formatter: string,
    arg: string,
  ): string {
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

  private formatCurrency(amount: number, currency: string): string {
    if (currency === 'INR') {
      return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    }
    return `${currency} ${amount.toFixed(2)}`;
  }

  private formatDate(dateStr: string, pattern: string): string {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;

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
    } catch {
      return dateStr;
    }
  }
}
