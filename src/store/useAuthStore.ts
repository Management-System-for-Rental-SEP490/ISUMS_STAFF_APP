import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthState, ForgotPasswordState, RegisterState, MenuModalState } from "../shared/types";

/*
Giải thích logic, ý nghĩa từng syntax trong hàm useAuthStore và cơ chế zustand hoạt động (so với useState):

1. `const useAuthStore = create<AuthState>((set) => ({ ... }))`
   - `create` là hàm của thư viện Zustand, dùng để tạo một custom hook cho state management (quản lý trạng thái toàn cục).
   - Cú pháp generic `<AuthState>` như sau báo với TypeScript rằng kiểu dữ liệu state lưu trong store sẽ tuân thủ interface/type AuthState.
   - Hàm callback `(set) => ({ ... })` nhận vào một hàm set (tương tự setState trong useState) và trả về object chứa các thuộc tính (user, isLoggedIn, ...) đại diện “state” ban đầu và các hàm thay đổi state (actions).

2. Bên trong object khởi tạo:
   - `user: null,` và `isLoggedIn: false,` là giá trị khởi tạo trạng thái. 
   - `login: (username: string) => set({ user: username, isLoggedIn: true })` 
        - Đây là một action (hàm thay đổi state): khi gọi `login`, trạng thái trong store sẽ được cập nhật (user = username, isLoggedIn = true) bằng cách gọi `set`.
   - `logout: () => set({ user: null, isLoggedIn: false })`
        - Ngược lại, hàm logout sẽ reset lại user về null và isLoggedIn thành false.

3. Cách dùng và cơ chế hoạt động:
   - Khi bạn gọi `useAuthStore()` trong bất kỳ component nào, Zustand sẽ cung cấp state hiện tại (user/isLoggedIn) và các hàm login, logout.
   - Bất kỳ component nào dùng hook này sẽ tự động nhận update khi state thay đổi.
   - Không như `useState` hay `useReducer` của React chỉ quản lý state trong 1 component, Zustand tạo ra một global store ở ngoài React tree, nhờ đó bạn có thể lấy/truy cập state/dispatch actions ở bất kỳ đâu mà không cần truyền props hoặc dùng context phức tạp.
   - Cơ chế này đơn giản nhưng mạnh mẽ, state “shared” giữa các màn hình, trang, component một cách tối ưu.

Tóm lại:
- Zustand quản lý trạng thái tập trung bằng một store toàn cục.
- useAuthStore cho phép mọi component truy cập và chỉnh sửa trạng thái đăng nhập, login/logout tiện lợi và nhất quán, không cần props drilling.
- Cú pháp object return trong create giúp khai báo state ban đầu và các “thao tác” với state ngay tại chỗ.
 Update: Thêm persist middleware để lưu trạng thái đăng nhập vào AsyncStorage.
  Khi app mở lại, state sẽ được tự động khôi phục (rehydrated).
*/
//state (tham số đầu vào) đại diện cho "Bản ghi nhớ cũ" trước khi bạn sửa đổi.
const useAuthStore = create<AuthState>()(
  persist( // middleware của Zustand giúp lưu state vào AsyncStorage (ổ cứng điện thoại).
    (set, get) => ({
      user: null,
      role: null,
      token: null,
      idToken: null,
      refreshToken: null,
      houseId: null,
      isLoggedIn: false,
      onboardedUsers: [], // Danh sách các user đã xem Intro
      keycloakInAppSession: null,
      setKeycloakInAppSession: (s) => set({ keycloakInAppSession: s }),

      setHouseId: (id: string | null) => set({ houseId: id }),

      login: (data) => {
        // Staff app: không cho tenant đăng nhập
        if (data.role === "tenant") return;
        set((state) => ({
          user: data.username,
          role: data.role,
          token: data.token,
          idToken: data.idToken ?? null,
          refreshToken: data.refreshToken ?? null,
          houseId: data.houseId ?? null,
          isLoggedIn: true,
          // Giữ nguyên onboardedUsers
          onboardedUsers: state.onboardedUsers, 
        }));
      },

      logout: () =>
        set((state) => ({
          user: null,
          role: null,
          token: null,
          idToken: null,
          refreshToken: null,
          houseId: null,
          isLoggedIn: false,
          // KHÔNG reset onboardedUsers để ghi nhớ lịch sử của các user trên máy này
          onboardedUsers: state.onboardedUsers, 
        })),

      completeOnboarding: () => {
        const currentUser = get().user;
        if (currentUser) {
          set((state) => {
            // Nếu user này chưa có trong list thì thêm vào
            if (!state.onboardedUsers.includes(currentUser)) {
              return { onboardedUsers: [...state.onboardedUsers, currentUser] };
            }
            return {}; // trả về state hiện tại là rỗng sau khi đã thêm thành công
          });
        }
      },
    }),
    {
      name: "auth-storage-v2", // Đổi tên key để reset data cũ (tránh lỗi conflict type)
      storage: createJSONStorage(() => AsyncStorage), // lưu vào ổ cứng điện thoại
      partialize: (state) => ({ // chọn lọc những gì muốn lưu
        user: state.user,
        role: state.role,
        token: state.token,
        idToken: state.idToken,
        refreshToken: state.refreshToken,
        houseId: state.houseId,
        isLoggedIn: state.isLoggedIn,
        onboardedUsers: state.onboardedUsers, // lưu xuống ổ cứng
      }),
    }
  )
);
// ko sài nữa
const useRegisterStore = create<RegisterState>((set) => ({
  username: "",
  email: "",
  password: "",
  setUsername: (username: string) => set({ username }),
  setEmail: (email: string) => set({ email }),
  setPassword: (password: string) => set({ password }),
}));

const useForgotPasswordStore = create<ForgotPasswordState>((set) => ({
  email: "",
  setEmail: (email: string) => set({ email }),
  sendEmail: () => set({ email: "" }),
}));

// chưa sài
const useMenuStore = create<MenuModalState>((set) => ({
  visible: false,
  open: () => set({ visible: true }),
  close: () => set({ visible: false }),
}));

export { useAuthStore, useRegisterStore, useForgotPasswordStore, useMenuStore };
