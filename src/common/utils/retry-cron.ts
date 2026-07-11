import { EMAIL_TEMPLATE } from "@common/constants/emailTemplate";
import { sendEmail } from "@common/utils/email.util";
import { authRepository } from '../../modules/auth/repositories/auth.repository';

export async function runWithRetry<T>(
    fn: () => Promise<T>,
    branchId: string,
    serviceName: string,
    retries = 100,
    delayMs = 3000
): Promise<T> {
    let lastError: any;
    let alertSent = false;

    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (err) {
            lastError = err;

            console.error(`[RETRY] attempt ${i + 1} failed`, err);

            // gửi mail sau lần fail thứ 5 (chỉ 1 lần)
            if (i >= 4 && !alertSent) {
                alertSent = true;

                try {
                    const admin = await authRepository.getAdminByBranch(branchId);

                    if (admin?.email) {
                        await sendEmail(admin.email, "SCHEDULER CRON IS FAILED", EMAIL_TEMPLATE.ALERT_RETRY_FAILED(serviceName, String(err), new Date().toISOString()))
                    }
                } catch (mailErr) {
                    console.error(`[ALERT MAIL FAILED]`, mailErr);
                }
            }

            if (i < retries - 1) {
                await sleep(delayMs * (i + 1));
            }
        }
    }

    throw lastError;
}


function sleep(ms: number) {
    return new Promise((res) => setTimeout(res, ms));
}