import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getUserProfile, updateUserProfile } from "../services/userApi";
import { UserProfileResponse } from "../types/api";

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

// Hook cập nhật thông tin user
export const useUpdateUserMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateUserProfile, 
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: USER_KEYS.profile() });
      console.log("Update profile success!");
    },
    onError: (error) => {
      console.error("Update profile failed:", error);
    },
  });
};
