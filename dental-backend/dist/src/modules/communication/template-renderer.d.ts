export interface TemplateVariables {
    [key: string]: string | number | boolean | undefined | null;
}
export declare class TemplateRenderer {
    private readonly logger;
    render(template: string, variables: TemplateVariables): string;
    extractVariables(template: string): string[];
    private applyFormatter;
    private formatCurrency;
    private formatDate;
}
