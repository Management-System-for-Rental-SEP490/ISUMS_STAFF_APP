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
  logOut: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <Ionicons name="log-out-outline" size={size} color={color} />
  ),
  /** Icon cho tab Ticket (danh sách phiếu báo sự cố của Staff) */
  ticket: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <FontAwesome5 name="ticket-alt" size={size} color={color} />
  ),
  /** Icon dấu cộng (thêm danh mục / thêm thiết bị). */
  plus: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <AntDesign name="plus" size={size} color={color} />
  ),
  /** Icon X để xóa nội dung (dùng cho nút clear ô tìm kiếm). */
  close: ({ size = 24, color = 'black' }: IconProps = {}) => (
    <AntDesign name="close" size={size} color={color} />
  ),
};

export default Icons;