export type UserRole = 'reader' | 'author' | 'admin';

export type User = {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  name: string;
  avatar_url: string | null;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
};

export type PublicUser = Omit<User, 'password_hash'>;
