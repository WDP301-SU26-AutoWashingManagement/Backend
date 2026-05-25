import nodemailer from 'nodemailer';
import { env } from '../../configs/env.config';

export const transporter = nodemailer.createTransport({
  host: env.EMAIL_HOST,
  port: env.EMAIL_PORT,
  secure: false,
  auth: { user: env.EMAIL_USER, pass: env.EMAIL_PASS },
});

export const sendEmail = async (to: string, subject: string, html: string): Promise<void> => {
  await transporter.sendMail({ from: env.EMAIL_FROM, to, subject, html });
};
