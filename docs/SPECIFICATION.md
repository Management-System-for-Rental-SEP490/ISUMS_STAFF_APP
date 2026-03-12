# ISUMS Staff App – Đặc tả & Kịch bản

> **Ứng dụng dành riêng cho Nhân viên kỹ thuật (role `technical`).**  
> **Dữ liệu:** Phần lớn dùng mock. *Khi có API từ BE: áp dụng vào và xóa mock data.*

---

## 1. Tổng quan

- **App:** ISUMS Staff App (tách từ ISUMS gốc)
- **Role:** Chỉ `technical` (thợ kỹ thuật)
- **Auth:** Keycloak (đã kết nối BE)
- **Cấu trúc:** `src/features/staff/`, `src/shared/`, `src/store/`, `src/navigation/`

---

## 2. Kịch bản chuẩn theo màn hình / form

### 2.1. Login (LoginScreen)

| Bước | Hành động | Kết quả |
|------|-----------|---------|
| 1 | Mở app | Hiện màn Login (Keycloak) |
| 2 | Nhấn "Đăng nhập" | Mở WebView Keycloak |
| 3 | Nhập username/password Keycloak | Xác thực IdP |
| 4 | Redirect về app | Nếu role = `technical` → vào Main; nếu khác → báo "App chỉ dành cho nhân viên kỹ thuật" |

**Data:** Keycloak (API). Không mock.

---

### 2.2. Dashboard / Home (StaffHomeScreen)

| Bước | Hành động | Kết quả |
|------|-----------|---------|
| 1 | Vào Main | Hiện lịch tuần + danh sách thiết bị (theo category) |
| 2 | Chọn category | Lọc thiết bị theo category |
| 3 | Nhấn vào thiết bị | Navigate → ItemDescription |
| 4 | Nhấn tab Dashboard (giữa) | Mở Camera (quét QR/NFC) |

**Data:**  
- **Đã API:** Houses (`useHouses`), Asset Items (`useAssetItems`), Categories (`useAssetCategories`)  
- **Mock:** Lịch tuần (`getWorkScheduleThisWeek`, `MOCK_TICKET_ASSIGNMENTS`, `MOCK_NEXT_WEEK_SLOTS`)  
- *Khi có API từ BE: thay bằng API lịch/slot, xóa mock trong `mockStaffData.ts`*

---

### 2.3. Danh sách Ticket (TicketListScreen)

| Bước | Hành động | Kết quả |
|------|-----------|---------|
| 1 | Vào tab Ticket | Hiện danh sách ticket |
| 2 | Filter theo status/priority | Danh sách lọc lại |
| 3 | Nhấn ticket | Navigate → TicketDetail |

**Data:** **Mock** `MOCK_STAFF_TICKETS`  
*Khi có API từ BE: thay bằng React Query, xóa `MOCK_STAFF_TICKETS` trong `mockStaffData.ts`*

---

### 2.4. Chi tiết Ticket (TicketDetailScreen)

| Bước | Hành động | Kết quả |
|------|-----------|---------|
| 1 | Mở từ TicketList | Hiện thông tin ticket |
| 2 | Nhấn "Nhận Ticket" (nếu pending) | Gán ticket cho staff (hiện mock) |
| 3 | Nhấn "Đặt lịch" | Mở BookScheduleModal |
| 4 | Chọn ngày + slot → Xác nhận | Đóng modal (hiện mock) |

**Data:** **Mock** `MOCK_STAFF_TICKETS`, `MOCK_TICKET_ASSIGNMENTS`  
*Khi có API từ BE: gọi API nhận ticket, đặt lịch; xóa logic mock*

---

### 2.5. Lịch làm việc (CalendarScreen)

| Bước | Hành động | Kết quả |
|------|-----------|---------|
| 1 | Vào tab Calendar | Hiện lịch tuần (slot 8h–18h) |
| 2 | Nhấn slot trống | Mở ChooseScheduleSlotModal |
| 3 | Chọn slot tuần sau → Đăng ký | Cập nhật (hiện mock) |
| 4 | Nhấn slot đã có task | Xem chi tiết ticket |

**Data:** **Mock** `getWorkScheduleThisWeek`, `MOCK_TICKET_ASSIGNMENTS`, `MOCK_NEXT_WEEK_SLOTS`  
*Khi có API từ BE: thay bằng API lịch/đăng ký slot, xóa mock*

---

### 2.6. Chi tiết Building (BuildingDetailScreen)

| Bước | Hành động | Kết quả |
|------|-----------|---------|
| 1 | Từ Home hoặc danh sách nhà | Mở chi tiết nhà |
| 2 | Xem danh sách thiết bị | Lọc theo category (nếu có) |
| 3 | Nhấn "Gán NFC" | Mở AssignNfcModal → quét thẻ |
| 4 | Gán xong | Đóng modal, cập nhật UI |

**Data:**  
- **Đã API:** Houses, Asset Items  
- **Mock:** `getStaffAssetsByBuildingId` (nếu dùng)  
*Khi có API từ BE: dùng API thiết bị theo houseId, xóa mock*

---

### 2.7. Danh mục thiết bị (CategoryListScreen, CategoryEditScreen)

| Bước | Hành động | Kết quả |
|------|-----------|---------|
| 1 | Vào CategoryList | Hiện danh sách danh mục |
| 2 | Nhấn "Thêm" / "Sửa" | Mở form (modal) |
| 3 | Điền tên, mô tả → Lưu | Gọi API create/update |

**Data:** **Đã API** `assetCategoryApi`. Không mock.

---

### 2.8. Thiết bị (ItemListScreen, ItemCreateScreen, ItemEditScreen, ItemDescription)

| Bước | Hành động | Kết quả |
|------|-----------|---------|
| 1 | Vào ItemList | Hiện danh sách theo category/house |
| 2 | Nhấn "Thêm" | Mở ItemCreate form |
| 3 | Điền form → Lưu | Gọi API create |
| 4 | Nhấn item → Sửa | Mở ItemEdit (modal) |
| 5 | Quét NFC/QR → Tra cứu | Hiện ItemDescription |

**Data:** **Đã API** `assetItemApi`. Không mock.

---

### 2.9. Thông báo (StaffNotificationScreen)

| Bước | Hành động | Kết quả |
|------|-----------|---------|
| 1 | Vào tab Notification | Hiện danh sách thông báo |
| 2 | Nhấn thông báo (có ticketId) | Navigate → TicketDetail |

**Data:** **Mock** `MOCK_STAFF_NOTIFICATIONS`  
*Khi có API từ BE: thay bằng API thông báo, xóa mock*

---

### 2.10. Camera (CameraScreen) – Quét QR/NFC

| Bước | Hành động | Kết quả |
|------|-----------|---------|
| 1 | Mở từ tab Dashboard | Chế độ lookup (tra cứu) |
| 2 | Quét NFC đã gán | Hiện ItemDescription |
| 3 | Từ AssignNfcModal: quét thẻ mới | Gán NFC cho thiết bị (gọi API) |

**Data:** **Đã API** `getAssetItemByNfcId`, `attachAssetTag`. Không mock (lookup dùng API).

---

### 2.11. Profile (UserProfileScreen)

| Bước | Hành động | Kết quả |
|------|-----------|---------|
| 1 | Vào tab Profile | Hiện thông tin user |
| 2 | Nhấn "Đăng xuất" | Gọi Keycloak logout, về Login |

**Data:** Keycloak + `userApi`. Không mock.

---

## 3. Bảng tổng hợp Mock vs API

| Màn hình / Tính năng | Nguồn dữ liệu | Ghi chú khi có BE |
|----------------------|---------------|-------------------|
| Login | Keycloak (API) | — |
| StaffHomeScreen | API (houses, items, categories) + **Mock** (lịch) | Thay lịch/slot bằng API, xóa mock |
| TicketListScreen | **Mock** | Thay bằng API ticket, xóa `MOCK_STAFF_TICKETS` |
| TicketDetailScreen | **Mock** | Thay API nhận ticket, đặt lịch |
| CalendarScreen | **Mock** | Thay API lịch, slot, xóa mock |
| BuildingDetailScreen | API + có thể mock asset | Dùng API items theo houseId |
| CategoryList, CategoryEdit | API | — |
| ItemList, ItemCreate, ItemEdit, ItemDescription | API | — |
| StaffNotificationScreen | **Mock** | Thay API thông báo, xóa mock |
| CameraScreen | API | — |
| UserProfileScreen | API | — |

---

## 4. Cấu trúc thư mục

```
src/
├── features/staff/          # Màn Staff
│   ├── screens/
│   │   ├── staffHome/
│   │   ├── staffHouse/
│   │   ├── staffItems/
│   │   ├── staffCategory/
│   │   ├── staffTicket/
│   │   ├── staffCalendar/
│   │   └── staffnotification/
│   ├── modal/assignNFC/
│   ├── context/
│   └── data/mockStaffData.ts  # Xóa khi có API
├── features/screens/         # Login, Onboarding, UserProfile
├── features/modal/camera/
├── shared/
└── store/
```

---

## 5. Skills Vercel

- **Tuân thủ:** `.agents/skills/vercel-react-native-skills` (React Native rules)
