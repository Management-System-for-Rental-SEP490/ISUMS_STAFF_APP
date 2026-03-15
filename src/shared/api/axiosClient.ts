import axios from "axios";
import i18n from "../i18n";
import { useAuthStore } from "../../store/useAuthStore";
import { refreshAccessToken, logoutKeycloak } from "../services/keycloakAuth";
import { CustomAlert } from "../components/alert";

const axiosClient = axios.create({
  // Base URL của Backend API (Không phải Keycloak)
  // Bạn có thể đặt biến môi trường hoặc hardcode tạm
  // baseURL: "http://your-backend-api.com/api", 
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Tự động gắn Token và ngôn ngữ vào Header
axiosClient.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Ngôn ngữ hiện tại, mặc định 'vi' khi BE chưa hỗ trợ / không bắt được
    // Khi BE có bảng đa ngôn ngữ, sẽ dựa vào header này để trả đúng dữ liệu
    config.headers["Accept-Language"] = i18n.language || "vi";
    return config;
  },
  (error) => Promise.reject(error)
);

// Biến cờ để tránh gọi refresh token nhiều lần cùng lúc
let isRefreshing = false;
// Hàng đợi các request bị lỗi cần retry sau khi refresh thành công
let failedQueue: any[] = [];
// hàm xử lý hàng đợi các request bị lỗi cần retry sau khi refresh thành công
const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor: Xử lý lỗi 401
axiosClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Nếu lỗi 401 và chưa từng retry
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Nếu đang refresh, xếp request này vào hàng đợi
        return new Promise(function (resolve, reject) {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(axiosClient(originalRequest));
            },
            reject: (err: any) => {
              reject(err);
            },
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;

        if (!refreshToken) {
            // Không có refresh token -> Logout
            throw new Error("No refresh token available");
        }

        // Gọi Keycloak để lấy token mới
        const newAuthData = await refreshAccessToken(refreshToken);

        // Staff app: không cho tenant đăng nhập (kể cả khi refresh token). Xóa session Keycloak.
        if (newAuthData.role === "tenant") {
          processQueue(new Error("User role not allowed"), null);
          useAuthStore.getState().logout();
          await logoutKeycloak(newAuthData.idToken);
          CustomAlert.alert(
            i18n.t("tenant_blocked_title"),
            i18n.t("tenant_blocked_message"),
            [{ text: i18n.t("common.close") }]
          );
          return Promise.reject(new Error("User role not allowed"));
        }

        // Lưu vào Store
        useAuthStore.getState().login(newAuthData);

        // Xử lý hàng đợi đang chờ
        processQueue(null, newAuthData.token);

        // Gắn token mới vào request hiện tại và thử lại
        originalRequest.headers.Authorization = `Bearer ${newAuthData.token}`;
        return axiosClient(originalRequest);

      } catch (err) {
        // Refresh thất bại (Token hết hạn hẳn hoặc bị thu hồi) -> Logout
        processQueue(err, null);
        useAuthStore.getState().logout();
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default axiosClient;
