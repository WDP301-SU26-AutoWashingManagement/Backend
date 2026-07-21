import { ImageType } from '../../../common/constants/image-type.enum';
import { IVerificationResult, VerificationDetails } from '../interfaces/verification.interface';

export class VerificationResultDto implements IVerificationResult {
    public isValid: boolean;
    public confidence: number;
    public type: ImageType;
    public details: VerificationDetails;
    public reason: string;
    public rawText?: string;

    constructor(data: IVerificationResult) {
        this.isValid = data.isValid;
        this.confidence = Number(data.confidence.toFixed(2));
        this.type = data.type;
        this.details = data.details;
        this.reason = data.reason;
        this.rawText = data.rawText;
    }
}