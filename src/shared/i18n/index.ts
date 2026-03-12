import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageDetectorAsyncModule } from 'i18next';

// Import translations
import vi from './vietnamese';
import en from './english';
import ja from './japanese';

// Module phát hiện ngôn ngữ (đọc/ghi từ AsyncStorage)
const languageDetector: LanguageDetectorAsyncModule = {
  type: 'languageDetector',
  async: true,
  detect: (callback) => {
    AsyncStorage.getItem('user-language') // Gọi AsyncStorage để lấy giá trị đã lưu với key là 'user-language'
      .then((language) => {
        if (language) {
          callback(language); // Gọi callback để báo cho i18next biết: "Hãy dùng ngôn ngữ này!"
        } else {
          callback('vi'); //nếu không có giá trị thì gọi callback với giá trị là 'vi'
        }
      })
      .catch((error) => {
        console.log('Lỗi đọc ngôn ngữ', error);
        callback('vi');
      });
  },
  init: () => {},
  // i18next gọi hàm này mỗi khi người dùng đổi ngôn ngữ (i18n.changeLanguage)
  cacheUserLanguage: async (language) => {
    try {
      // Lưu mã ngôn ngữ vào bộ nhớ máy với key 'user-language'
      await AsyncStorage.setItem('user-language', language);
    } catch (error) {
      console.log('Lỗi lưu ngôn ngữ', error);
    }
  },
};

// Định nghĩa các bản dịch
const resources = {
  vi: {
    translation: vi
  },
  en: {
    translation: en
  },
  ja: {
    translation: ja
  }
};

i18n
  .use(languageDetector) // Sử dụng bộ phát hiện ngôn ngữ (AsyncStorage)
  .use(initReactI18next)
  .init({
    resources,
    lng: "vi", // Ngôn ngữ mặc định khi khởi động (trước khi detector chạy)
    fallbackLng: "vi", // Khi không bắt được ngôn ngữ từ BE hoặc thiếu bản dịch -> dùng tiếng Việt
    interpolation: {
      escapeValue: false 
    },
    react: {
      useSuspense: false // Tránh lỗi suspense trên Android cũ
    }
  });

export default i18n;