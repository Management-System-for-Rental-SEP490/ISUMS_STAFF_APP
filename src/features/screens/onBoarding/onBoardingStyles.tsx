import { StyleSheet, Dimensions, Platform } from "react-native";
import { brandPrimary, neutral } from "../../../shared/theme/color";
import { appTypography } from "../../../shared/utils/typography";

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
    borderRadius: width * 0.3,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  image: {
    width: width * 0.45,
    height: width * 0.45,
    borderRadius: width * 0.225,
    resizeMode: "cover",
  },
  textContainer: {
    paddingHorizontal: 40,
    alignItems: "center",
  },
  title: {
    ...appTypography.onboardingTitle,
    color: neutral.surface,
    marginBottom: 16,
    textAlign: "center",
    textShadowColor: "rgba(0, 0, 0, 0.1)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  description: {
    ...appTypography.onboardingBody,
    color: neutral.textMintSoft,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
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
    backgroundColor: neutral.surface,
    marginHorizontal: 4,
  },
  buttonContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  button: {
    backgroundColor: neutral.surface,
    paddingVertical: 16,
    paddingHorizontal: 60,
    borderRadius: 30,
    elevation: 5,
    shadowColor: neutral.slate900,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  buttonText: {
    ...appTypography.screenHeader,
    color: brandPrimary,
  },
  topSkipButton: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 40,
    right: 20,
    zIndex: 10,
    padding: 10,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 20,
    paddingHorizontal: 15,
  },
  skipText: {
    ...appTypography.body,
    color: neutral.surface,
    fontWeight: "700",
  },
});

export default styles;
