import { StyleSheet, Dimensions, Platform } from "react-native";

const { width, height } = Dimensions.get("window");

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slide: {
    width: width,
    height: height,
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: height * 0.15,
  },
  imageContainer: {
    height: width * 0.8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  imageWrapper: {
    width: width * 0.6,
    height: width * 0.6,
    //backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: width * 0.3, // Bo tròn viền ngoài
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden', // Cắt phần thừa của ảnh bên trong nếu có
  },
  image: {
    width: width * 0.45, // Tăng kích thước ảnh lên xíu cho cân đối
    height: width * 0.45,
    borderRadius: width * 0.225, // Bo tròn ảnh (1/2 width)
    resizeMode: "cover", // Đổi thành cover để ảnh lấp đầy khung tròn nếu cần, hoặc contain nếu muốn giữ nguyên tỉ lệ
  },
  textContainer: {
    paddingHorizontal: 40,
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#FFFFFF",
    marginBottom: 16,
    textAlign: "center",
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  description: {
    fontSize: 16,
    color: "#E0F2F1",
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "500",
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  paginationContainer: {
    flexDirection: "row",
    marginBottom: 30,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
    marginHorizontal: 4,
  },
  buttonContainer: {
    width: '100%',
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    position: 'relative',
  },
  button: {
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    paddingHorizontal: 60,
    borderRadius: 30,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  buttonText: {
    color: "#3bb582",
    fontSize: 18,
    fontWeight: "bold",
  },
  // Style mới cho nút Skip ở góc trên
  topSkipButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 40, // Cách top an toàn
    right: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.1)', // Nền mờ nhẹ cho dễ nhìn
    borderRadius: 20,
    paddingHorizontal: 15,
  },
  skipText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "bold",
  },
});

export default styles;
