export interface GeneratePasswordRequest {
  username: string;
}

export interface GeneratePasswordResponse {
  message: string;
  username: string;
  qr_code_base64: string;
  error?: string;
}

export interface Generate2FARequest {
  username: string;
}

export interface Generate2FAResponse {
  message: string;
  username: string;
  qr_code_2fa_base64: string;
  manual_entry_key: string;
  error?: string;
}

export interface AuthUserRequest {
  username: string;
  password: string;
  code_2fa: string;
}

export interface AuthUserResponse {
  status?: string;
  message: string;
  username?: string;
  token?: string;
  error?: string;
}

export interface ApiError {
  error: string;
}

