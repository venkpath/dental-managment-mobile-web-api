import type { Response } from 'express';
export declare class CsrfController {
    getToken(res: Response): {
        token: string;
    };
}
