export const EMAIL_TEMPLATE = {
    GOOGLE_REGISTERED_PASSWORD: (
        fullName: string,
        randomPassword: string
    ): string => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
        
        <div style="background: #2563eb; padding: 20px; text-align: center; color: white;">
            <h1 style="margin: 0;">Welcome</h1>
        </div>

        <div style="padding: 30px;">
            <p>Xin chào <strong>${fullName}</strong>,</p>

            <p>
            Tài khoản của bạn đã được tạo thành công bằng Google Login.
            </p>

            <p>
            Hệ thống đã tạo mật khẩu ngẫu nhiên để bạn có thể đăng nhập bằng email/password nếu cần.
            </p>

            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; text-align: center; margin: 25px 0;">
            <p style="margin-bottom: 10px; color: #6b7280;">
                Your temporary password
            </p>

            <h2 style="margin: 0; color: #111827; letter-spacing: 2px;">
                ${randomPassword}
            </h2>
            </div>

            <p style="color: #dc2626;">
            Vì lý do bảo mật, vui lòng đổi mật khẩu sau lần đăng nhập đầu tiên.
            </p>

            <p>
            Nếu bạn không thực hiện đăng ký này, vui lòng liên hệ hỗ trợ ngay lập tức.
            </p>

            <br />

            <p>Best regards,</p>
            <p><strong>Your System</strong></p>
        </div>

        <div style="background: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
            © 2026 Your Company. All rights reserved.
        </div>

        </div>
    `
}