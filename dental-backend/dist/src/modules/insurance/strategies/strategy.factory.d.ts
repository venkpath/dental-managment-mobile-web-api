import { IndiaInsuranceStrategy } from './india.strategy.js';
import type { CountryInsuranceStrategy } from './country-strategy.interface.js';
export declare class InsuranceStrategyFactory {
    private readonly india;
    constructor(india: IndiaInsuranceStrategy);
    get(country: string): CountryInsuranceStrategy;
}
