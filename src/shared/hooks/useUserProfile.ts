import { useQuery } from "@tanstack/react-query";
import { getUserProfile } from "../services/userApi";

// Query Key
export const USER_KEYS = {
  all: ["user"] as const,
  profile: () => [...USER_KEYS.all, "profile"] as const,
};

// Hook lấy thông tin user
export const useUserProfile = () => {
  return useQuery({
    queryKey: USER_KEYS.profile(), 
    queryFn: getUserProfile,       
  });
};

// Hiện tại BE chưa có API update profile nên tạm thời không export hook update.
