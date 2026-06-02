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
    `,

    FORGOT_PASSWORD: (otp: string): string => `
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="UTF-8" />
        <style>
            body { font-family: Arial; background:#f4f4f4; margin:0; padding:0; }
            .container {
            max-width:480px;
            margin:40px auto;
            background:#fff;
            border-radius:10px;
            padding:32px;
            box-shadow:0 2px 12px rgba(0,0,0,0.08);
            }
            .logo { text-align:center; margin-bottom:24px; }
            .logo span { font-size:24px; font-weight:bold; color:#2563eb; }
            h2 { text-align:center; color:#1e293b; }
            p { color:#475569; line-height:1.6; }
            .otp-box {
            background:#eff6ff;
            border:2px dashed #2563eb;
            border-radius:8px;
            text-align:center;
            padding:20px;
            margin:24px 0;
            }
            .otp-code {
            font-size:36px;
            font-weight:bold;
            color:#2563eb;
            letter-spacing:8px;
            }
            .footer {
            margin-top:24px;
            border-top:1px solid #e2e8f0;
            padding-top:16px;
            font-size:12px;
            text-align:center;
            color:#94a3b8;
            }
        </style>
        </head>

        <body>
        <div class="container">

            <div class="logo">
            <span>🚗 AutoWash</span>
            </div>

            <h2>Đặt lại mật khẩu</h2>

            <p>Nhập mã OTP dưới đây để đặt lại mật khẩu của bạn:</p>

            <div class="otp-box">
            <div class="otp-code">${otp}</div>
            </div>

            <p style="text-align:center;color:#94a3b8;font-size:13px;">
            ⏱ Mã có hiệu lực trong <strong>5 phút</strong>
            </p>

            <p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>

            <div class="footer">
            © ${new Date().getFullYear()} AutoWash
            </div>

        </div>
        </body>
        </html>
    `,
}