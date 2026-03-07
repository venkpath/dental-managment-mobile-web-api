import { SetMetadata } from '@nestjs/common';

export const TRACK_AI_USAGE_KEY = 'trackAiUsage';
export const TrackAiUsage = () => SetMetadata(TRACK_AI_USAGE_KEY, true);
