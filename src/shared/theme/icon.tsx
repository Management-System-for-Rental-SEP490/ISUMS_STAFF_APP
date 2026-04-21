import FontAwesome from '@expo/vector-icons/FontAwesome';
import AntDesign from '@expo/vector-icons/AntDesign';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Entypo from '@expo/vector-icons/Entypo';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { IconProps } from '../types';
import { LogoHomeIcon } from './LogoIcon';
import Ionicons from '@expo/vector-icons/build/Ionicons';


const Icons = {
  home: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <Entypo name="home" size={size} color={color} />
  ),
  user: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <FontAwesome name="user" size={size} color={color} />
  ),
  menu: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <AntDesign name="menu" size={size} color={color} />
  ),
  water: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <FontAwesome5 name="hand-holding-water" size={size} color={color} />
  ),
  electric: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <MaterialIcons name="electrical-services" size={size} color={color} />
  ),
  search: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <MaterialIcons name="search" size={size} color={color} />
  ),
  /** Quét QR / tra cứu thiết bị. */
  scanLookup: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <MaterialIcons name="qr-code" size={size} color={color} />
  ),
  /** Quét NFC. */
  nfc: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <MaterialIcons name="nfc" size={size} color={color} />
  ),
  contract: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <FontAwesome5 name="file-contract" size={size} color={color} />
  ),
  brain: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <FontAwesome5 name="brain" size={size} color={color} />
  ),
  people: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <FontAwesome6 name="people-group" size={size} color={color} />
  ),
  logoHome: ({ size = 24 }: IconProps = {}) => <LogoHomeIcon width={size} height={size} />,
  calendar: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <AntDesign name="calendar" size={size} color={color} />
  ),
  notification: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <FontAwesome name="bell" size={size} color={color} />
  ),
  mail: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <MaterialIcons name="mail" size={size} color={color} />
  ),
  call: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <MaterialIcons name="call" size={size} color={color} />
  ),
  shield: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <FontAwesome5 name="shield-alt" size={size} color={color} />
  ),
  chevronForward: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <Ionicons name="chevron-forward" size={size} color={color} />
  ),
  chevronBack: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <Ionicons name="chevron-back" size={size} color={color} />
  ),
  chevronDown: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <Ionicons name="chevron-down" size={size} color={color} />
  ),
  logOut: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <Ionicons name="log-out-outline" size={size} color={color} />
  ),
  /** Icon cho tab Ticket (danh sách phiếu báo sự cố của Staff) */
  ticket: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <FontAwesome5 name="ticket-alt" size={size} color={color} />
  ),
  /** Danh sách thiết bị / tab Devices */
  devices: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <MaterialIcons name="devices-other" size={size} color={color} />
  ),
  /** Icon dấu cộng (thêm danh mục / thêm thiết bị). */
  plus: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <AntDesign name="plus" size={size} color={color} />
  ),
  /** Icon X để xóa nội dung (dùng cho nút clear ô tìm kiếm). */
  close: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <AntDesign name="close" size={size} color={color} />
  ),

  /** Work Slot Detail: khung giờ (section header + row). */
  schedule: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <MaterialIcons name="schedule" size={size} color={color} />
  ),
  /** Work Slot Detail: thời gian (access-time). */
  accessTime: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <MaterialIcons name="access-time" size={size} color={color} />
  ),
  /** Work Slot Detail: loại công việc. */
  workOutline: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <MaterialIcons name="work-outline" size={size} color={color} />
  ),
  /** Work Slot Detail: trạng thái. */
  flag: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <MaterialIcons name="flag" size={size} color={color} />
  ),
  /** Ticket list: hoàn thành / success */
  checkCircle: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <MaterialIcons name="check-circle" size={size} color={color} />
  ),
  /** Camera: chuyển camera trước/sau */
  flipCamera: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <MaterialIcons name="flip-camera-android" size={size} color={color} />
  ),
  /** Work Slot Detail: thông tin job (section header). */
  assignment: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <MaterialIcons name="assignment" size={size} color={color} />
  ),
  /** Work Slot Detail: job id, tag. */
  tag: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <MaterialIcons name="tag" size={size} color={color} />
  ),
  /** Work Slot Detail: plan id, folder. */
  folder: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <MaterialIcons name="folder" size={size} color={color} />
  ),
  /** Work Slot Detail: sự kiện, ngày (event). */
  event: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <MaterialIcons name="event" size={size} color={color} />
  ),
  /** Section header — thông tin (đồng bộ UI tenant ticket detail). */
  infoOutline: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <MaterialIcons name="info-outline" size={size} color={color} />
  ),
  /** Section header — mô tả / nội dung. */
  subject: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <MaterialIcons name="subject" size={size} color={color} />
  ),
  /** Section header — ảnh đính kèm. */
  photoLibrary: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <MaterialIcons name="photo-library" size={size} color={color} />
  ),
  /** Chụp ảnh / máy ảnh */
  camera: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <MaterialIcons name="photo-camera" size={size} color={color} />
  ),
  /** Thu gọn panel (ô tìm trong dropdown) */
  expandLess: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <MaterialIcons name="expand-less" size={size} color={color} />
  ),
  /** Tiền mặt / thanh toán (modal chọn phương thức). */
  attachMoney: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <MaterialIcons name="attach-money" size={size} color={color} />
  ),
  /** VNPay / thanh toán trực tuyến. */
  accountBalanceWallet: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <MaterialIcons name="account-balance-wallet" size={size} color={color} />
  ),
};

export default Icons;