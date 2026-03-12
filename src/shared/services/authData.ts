import { AuthPayload, UserRole } from "../types";

type MockUser = {
  username: string;
  password: string;
  role: UserRole;
};

const mockUsers: MockUser[] = [
  { username: "tenant", password: "tenant123", role: "tenant" },
  // { username: "landlord", password: "landlord123", role: "landlord" },
  // { username: "manager", password: "manager123", role: "manager" },
  { username: "Staff", password: "staff123", role: "technical" },
];

const createToken = (username: string) => `mock-token-${username}-${Date.now()}`;
const createRefreshToken = (username: string) =>
  `mock-refresh-${username}-${Math.floor(Math.random() * 1e6)}`;

export const mockLogin = async (username: string, password: string): Promise<AuthPayload> => {
  const user = mockUsers.find((item) => item.username === username && item.password === password);

  if (!user) {
    return Promise.reject(new Error("Thông tin đăng nhập không đúng. Vui lòng thử lại."));
  }

  return Promise.resolve({
    username: user.username,
    role: user.role,
    token: createToken(user.username),
    refreshToken: createRefreshToken(user.username),
  });
};

