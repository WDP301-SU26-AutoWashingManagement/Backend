import { IVerificationStrategy, IVerificationResult } from '../interfaces/verification.interface';

export abstract class BaseVerificationStrategy implements IVerificationStrategy {
    abstract verify(rawText: string): Promise<IVerificationResult>;
}