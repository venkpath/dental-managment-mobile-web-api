export interface ChartCondition {
    fdi: number;
    condition: string;
    surface?: string | null;
}
export declare const CONDITION_COLORS: Record<string, {
    fill: string;
    label: string;
}>;
export declare function buildToothChartSvg(conditions: ChartCondition[]): string;
export declare function renderToothChartPng(conditions: ChartCondition[], scale?: number): Promise<Buffer>;
