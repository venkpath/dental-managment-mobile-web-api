import { GoogleReviewsService } from './google-reviews.service.js';
export declare class GoogleReviewsCronService {
    private readonly googleReviews;
    private readonly logger;
    constructor(googleReviews: GoogleReviewsService);
    pollAllClinics(): Promise<void>;
}
