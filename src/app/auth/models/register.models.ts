export interface RegisterRequest {
  firstname: string;
  lastname: string;  
  email: string;
  password: string;
  username: string;
  phone?: string;
  departementId?: string;
  roleId: string;
  twoFactorEnabled?: boolean;

}

export interface RegisterResponse {
  id: string;
  firstname: string;
  lastname: string; 
  email: string;
  username: string;
  twoFactorEnabled: boolean;
  roleId: string;
}