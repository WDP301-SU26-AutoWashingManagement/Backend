export interface IForgotPasswordData {
  email: string;
}

export interface IVerifyOtpData {
  email: string;
  otp: string;
}

export interface IResetPasswordData {
  email: string;
  otp: string;
  new_password: string;
}

export interface IChangePasswordData {
  current_password: string;
  new_password: string;
  confirm_password: string;
}
