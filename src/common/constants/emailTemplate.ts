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
            <p><strong>Hybrid Wash</strong></p>
        </div>

        <div style="background: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
            © 2026 Hybrid Wash. All rights reserved.
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
            <span>🚗 Hybrid Wash</span>
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
            © ${new Date().getFullYear()} Hybrid Wash
            </div>

        </div>
        </body>
        </html>
    `,
    ALERT_RETRY_FAILED: (
        serviceName: string,
        errorMessage: string,
        time: string
    ): string => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden;">
        
            <div style="background: #dc2626; padding: 20px; text-align: center; color: white;">
                <h1 style="margin: 0;">SYSTEM ALERT</h1>
            </div>

            <div style="padding: 30px;">
                <p>Xin chào <strong>Admin</strong>,</p>

                <p>
                    Hệ thống đã gặp lỗi lặp lại nhiều lần khi thực thi service:
                </p>

                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p><strong>Service:</strong> ${serviceName}</p>
                    <p><strong>Time:</strong> ${time}</p>
                </div>

                <p><strong>Error message:</strong></p>

                <div style="background: #111827; color: #f9fafb; padding: 15px; border-radius: 8px; font-family: monospace; font-size: 13px; overflow-x: auto;">
                    ${errorMessage}
                </div>

                <p style="color: #dc2626; margin-top: 20px;">
                    Hệ thống đã retry hơn 5 lần nhưng vẫn thất bại. Vui lòng kiểm tra ngay.
                </p>

                <br />

                <p>Best regards,</p>
                <p><strong>System Monitoring</strong></p>
            </div>

            <div style="background: #f9fafb; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
                © ${new Date().getFullYear()} Hybrid Wash. All rights reserved.
            </div>

        </div>
    `,
    ASSIGNMENT_EMAIL : ({
        staffName,
        shiftDate,
        startTime,
        endTime,
        branchName,
    }: {
        staffName: string;
        shiftDate: string;
        startTime: string;
        endTime: string;
        branchName: string;
    }): string => {
        return `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8" />
            <title>Thông báo phân công ca làm việc</title>
        </head>
        <body style="margin:0;padding:0;background:#f5f6fa;font-family:Arial,sans-serif;">
            <div style="max-width:600px;margin:30px auto;background:#ffffff;border-radius:8px;overflow:hidden;">
                
                <div style="background:#2563eb;padding:20px;text-align:center;">
                    <h1 style="color:#ffffff;margin:0;">
                        THÔNG BÁO PHÂN CÔNG CA LÀM VIỆC
                    </h1>
                </div>

                <div style="padding:30px;">
                    <p>Xin chào <strong>${staffName}</strong>,</p>

                    <p>
                        Bạn đã được phân công vào một ca làm việc mới với thông tin như sau:
                    </p>

                    <table
                        style="
                            width:100%;
                            border-collapse:collapse;
                            margin:20px 0;
                        "
                    >
                        <tr>
                            <td style="padding:10px;border:1px solid #e5e7eb;">
                                <strong>Ngày làm việc</strong>
                            </td>
                            <td style="padding:10px;border:1px solid #e5e7eb;">
                                ${shiftDate}
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:10px;border:1px solid #e5e7eb;">
                                <strong>Giờ bắt đầu</strong>
                            </td>
                            <td style="padding:10px;border:1px solid #e5e7eb;">
                                ${startTime}
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:10px;border:1px solid #e5e7eb;">
                                <strong>Giờ kết thúc</strong>
                            </td>
                            <td style="padding:10px;border:1px solid #e5e7eb;">
                                ${endTime}
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:10px;border:1px solid #e5e7eb;">
                                <strong>Chi nhánh</strong>
                            </td>
                            <td style="padding:10px;border:1px solid #e5e7eb;">
                                ${branchName}
                            </td>
                        </tr>
                    </table>

                    <p>
                        Vui lòng kiểm tra lịch làm việc và có mặt đúng giờ.
                    </p>

                    <p>
                        Chúc bạn có một ngày làm việc hiệu quả.
                    </p>

                    <br />

                    <p>
                        Trân trọng,<br />
                        <strong>Phòng Quản Lý Nhân Sự</strong>
                    </p>
                </div>

                <div
                    style="
                        background:#f3f4f6;
                        padding:15px;
                        text-align:center;
                        color:#6b7280;
                        font-size:12px;
                    "
                >
                    Đây là email tự động của Hybrid Wash, vui lòng không trả lời email này.
                </div>
            </div>
        </body>
        </html>
        `
    }, 

    SHIFT_SWITCH_EMAIL: ({
        staffName,
        oldShiftDate,
        oldStartTime,
        oldEndTime,
        newShiftDate,
        newStartTime,
        newEndTime,
    }: {
        staffName: string;
        oldShiftDate: string;
        oldStartTime: string;
        oldEndTime: string;
        newShiftDate: string;
        newStartTime: string;
        newEndTime: string;
    }): string => {
        return `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8" />
            <title>Thông báo thay đổi ca làm việc</title>
        </head>
        <body style="margin:0;padding:0;background:#f5f6fa;font-family:Arial,sans-serif;">
            <div style="max-width:600px;margin:30px auto;background:#ffffff;border-radius:8px;overflow:hidden;">

                <div style="background:#f59e0b;padding:20px;text-align:center;">
                    <h1 style="color:#ffffff;margin:0;">
                        THÔNG BÁO THAY ĐỔI CA LÀM VIỆC
                    </h1>
                </div>

                <div style="padding:30px;">
                    <p>Xin chào <strong>${staffName}</strong>,</p>

                    <p>
                        Ca làm việc của bạn đã được thay đổi. Thông tin chi tiết như sau:
                    </p>

                    <h3>Ca làm việc cũ</h3>

                    <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
                        <tr>
                            <td style="padding:10px;border:1px solid #e5e7eb;"><strong>Ngày</strong></td>
                            <td style="padding:10px;border:1px solid #e5e7eb;">${oldShiftDate}</td>
                        </tr>
                        <tr>
                            <td style="padding:10px;border:1px solid #e5e7eb;"><strong>Bắt đầu</strong></td>
                            <td style="padding:10px;border:1px solid #e5e7eb;">${oldStartTime}</td>
                        </tr>
                        <tr>
                            <td style="padding:10px;border:1px solid #e5e7eb;"><strong>Kết thúc</strong></td>
                            <td style="padding:10px;border:1px solid #e5e7eb;">${oldEndTime}</td>
                        </tr>
                    </table>

                    <h3>Ca làm việc mới</h3>

                    <table style="width:100%;border-collapse:collapse;">
                        <tr>
                            <td style="padding:10px;border:1px solid #e5e7eb;"><strong>Ngày</strong></td>
                            <td style="padding:10px;border:1px solid #e5e7eb;">${newShiftDate}</td>
                        </tr>
                        <tr>
                            <td style="padding:10px;border:1px solid #e5e7eb;"><strong>Bắt đầu</strong></td>
                            <td style="padding:10px;border:1px solid #e5e7eb;">${newStartTime}</td>
                        </tr>
                        <tr>
                            <td style="padding:10px;border:1px solid #e5e7eb;"><strong>Kết thúc</strong></td>
                            <td style="padding:10px;border:1px solid #e5e7eb;">${newEndTime}</td>
                        </tr>
                    </table>

                    <p style="margin-top:20px;">
                        Vui lòng kiểm tra lại lịch làm việc để tránh nhầm lẫn.
                    </p>

                    <br />

                    <p>
                        Trân trọng,<br />
                        <strong>Phòng Quản Lý Nhân Sự</strong>
                    </p>
                </div>

                <div
                    style="
                        background:#f3f4f6;
                        padding:15px;
                        text-align:center;
                        color:#6b7280;
                        font-size:12px;
                    "
                >
                    Đây là email tự động của Hybrid Wash, vui lòng không trả lời email này.
                </div>

            </div>
        </body>
        </html>
        `
    },

    SHIFT_REMOVAL_EMAIL: ({
        staffName,
        shiftDate,
        startTime,
        endTime,
        branchName,
    }: {
        staffName: string;
        shiftDate: string;
        startTime: string;
        endTime: string;
        branchName: string;
    }): string => {
        return `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
            <meta charset="UTF-8" />
            <title>Thông báo hủy ca làm việc</title>
        </head>
        <body style="margin:0;padding:0;background:#f5f6fa;font-family:Arial,sans-serif;">
            <div style="max-width:600px;margin:30px auto;background:#ffffff;border-radius:8px;overflow:hidden;">
                
                <div style="background:#e11d48;padding:20px;text-align:center;">
                    <h1 style="color:#ffffff;margin:0;">
                        THÔNG BÁO HỦY CA LÀM VIỆC
                    </h1>
                </div>

                <div style="padding:30px;">
                    <p>Xin chào <strong>${staffName}</strong>,</p>

                    <p>
                        Ca làm việc của bạn đã được quản lý hủy bỏ khỏi lịch với thông tin như sau:
                    </p>

                    <table
                        style="
                            width:100%;
                            border-collapse:collapse;
                            margin:20px 0;
                        "
                    >
                        <tr>
                            <td style="padding:10px;border:1px solid #e5e7eb;">
                                <strong>Ngày làm việc</strong>
                            </td>
                            <td style="padding:10px;border:1px solid #e5e7eb;">
                                ${shiftDate}
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:10px;border:1px solid #e5e7eb;">
                                <strong>Giờ bắt đầu</strong>
                            </td>
                            <td style="padding:10px;border:1px solid #e5e7eb;">
                                ${startTime}
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:10px;border:1px solid #e5e7eb;">
                                <strong>Giờ kết thúc</strong>
                            </td>
                            <td style="padding:10px;border:1px solid #e5e7eb;">
                                ${endTime}
                            </td>
                        </tr>

                        <tr>
                            <td style="padding:10px;border:1px solid #e5e7eb;">
                                <strong>Chi nhánh</strong>
                            </td>
                            <td style="padding:10px;border:1px solid #e5e7eb;">
                                ${branchName}
                            </td>
                        </tr>
                    </table>

                    <p>
                        Vui lòng kiểm tra lại lịch làm việc cá nhân của bạn.
                    </p>

                    <br />

                    <p>
                        Trân trọng,<br />
                        <strong>Phòng Quản Lý Nhân Sự</strong>
                    </p>
                </div>

                <div
                    style="
                        background:#f3f4f6;
                        padding:15px;
                        text-align:center;
                        color:#6b7280;
                        font-size:12px;
                    "
                >
                    Đây là email tự động của Hybrid Wash, vui lòng không trả lời email này.
                </div>
            </div>
        </body>
        </html>
        `
    },
}