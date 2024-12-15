export class AuthResponseDto {
  accessToken?: string;
  refreshToken?: string;
  requiresEmailVerification?: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    emailVerifiedAt?: Date | null;
  };
}
