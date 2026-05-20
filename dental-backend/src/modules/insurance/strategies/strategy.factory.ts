import { Injectable, NotImplementedException } from '@nestjs/common';
import { IndiaInsuranceStrategy } from './india.strategy.js';
import type { CountryInsuranceStrategy } from './country-strategy.interface.js';

/**
 * Picks the right country-specific insurance strategy based on the
 * provider's country code. Add USA / Canada / UK strategies here when those
 * markets are wired up.
 */
@Injectable()
export class InsuranceStrategyFactory {
  constructor(private readonly india: IndiaInsuranceStrategy) {}

  get(country: string): CountryInsuranceStrategy {
    switch ((country || '').toUpperCase()) {
      case 'IN':
        return this.india;
      // case 'US': return this.usa;
      // case 'CA': return this.canada;
      default:
        throw new NotImplementedException(
          `Insurance support for country "${country}" is not yet enabled. India (IN) is currently supported.`,
        );
    }
  }
}
