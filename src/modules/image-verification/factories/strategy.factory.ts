import { ImageType } from '../../../common/constants/image-type.enum';
import { IVerificationStrategy } from '../interfaces/verification.interface';
import { BillVerificationStrategy } from '../strategies/bill.strategy';
import { QrVerificationStrategy } from '../strategies/qr-verification.strategy';

export class VerificationStrategyFactory {
    public static getStrategy(type: string): IVerificationStrategy {
        const normalizedType = type?.toUpperCase() as ImageType;

        switch (normalizedType) {
            case ImageType.BILL:
                return new BillVerificationStrategy();

            case ImageType.QR:
                return new QrVerificationStrategy();

            default:
                throw new Error(`Loại ảnh "${type}" hiện chưa được hệ thống hỗ trợ xử lý!`);
        }
    }
}