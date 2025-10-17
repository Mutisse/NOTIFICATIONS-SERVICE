import { UserMainRole, UserStatus, UserPreferences } from "../../models/User.model";

export interface UserRegistrationData {
  email: string;
  password: string;
  name: string;
  role?: UserMainRole;
  preferences?: Partial<UserPreferences>;
}

export interface UserLoginData {
  email: string;
  password: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: UserMainRole;
  status: UserStatus;
  isVerified: boolean;
  preferences: UserPreferences;
  lastLogin?: Date;
  createdAt: Date;
}

export interface UserUpdateData {
  name?: string;
  preferences?: Partial<UserPreferences>;
}

export interface UsersFilter {
  page?: number;
  limit?: number;
  role?: string;
  status?: string;
  search?: string;
}

export interface UsersResponse {
  users: UserProfile[];
  total: number;
  page: number;
  pages: number;
}