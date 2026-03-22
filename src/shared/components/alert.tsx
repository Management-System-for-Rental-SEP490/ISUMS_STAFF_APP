import React from 'react';
import { Modal, Text, View, TouchableOpacity, Animated, type TextStyle, type ViewStyle } from 'react-native';
import { create } from 'zustand';
import { alertStyles } from '../styles/alertStyles';
import { BRAND_DANGER, neutral } from '../theme/color';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAlertStore } from '../../store/useAlertStore';
import { AlertButton, AlertType } from '../types';




// Component
export const GlobalAlert = () => {
  const { visible, title, message, buttons, type, hide } = useAlertStore();
  const scaleValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.spring(scaleValue, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 8,
      }).start();
    } else {
      Animated.timing(scaleValue, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  // Không return null ngay để animation đóng hoạt động, nhưng cần ẩn modal khi scale về 0
  // Tuy nhiên với Modal native thì khó animate exit mượt mà nếu unmount.
  // Đơn giản nhất là render Modal khi visible = true.
  if (!visible) return null;

  const renderIcon = () => {
    switch (type) {
      case 'success':
        return (
          <View style={[alertStyles.iconContainer, alertStyles.iconSuccess]}>
            <Ionicons name="checkmark" size={32} color={neutral.iconMuted} />
          </View>
        );
      case 'error':
        return (
          <View style={[alertStyles.iconContainer, alertStyles.iconError]}>
            <MaterialIcons name="error-outline" size={32} color={BRAND_DANGER} />
          </View>
        );
      case 'warning':
        return (
          <View style={[alertStyles.iconContainer, alertStyles.iconWarning]}>
            <Ionicons name="warning-outline" size={32} color={neutral.iconMuted} />
          </View>
        );
      default:
        return (
          <View style={[alertStyles.iconContainer, alertStyles.iconInfo]}>
            <Ionicons name="information-circle-outline" size={32} color={neutral.iconMuted} />
          </View>
        );
    }
  };

  return (
    <Modal transparent visible={visible} animationType="fade" statusBarTranslucent>
      <View style={alertStyles.overlay}>
        <Animated.View style={[alertStyles.alertContainer, { transform: [{ scale: scaleValue }] }]}>
          {renderIcon()}
          <Text style={alertStyles.title}>{title}</Text>
          {message ? <Text style={alertStyles.message}>{message}</Text> : null}
          <View style={alertStyles.buttonContainer}>
            {buttons.map((btn: AlertButton, index: number) => {
              let btnStyle: ViewStyle = alertStyles.buttonSecondary;
              let textStyle: TextStyle = alertStyles.buttonTextSecondary;

              // Logic style:
              // - destructive -> buttonDanger (Red)
              // - default/cancel -> Secondary (Gray) unless it's the *only* button or the *confirm* action in a pair?
              // Let's refine:
              // If style is 'destructive': Red.
              // If style is 'cancel': Gray.
              // If style is 'default': Blue (Primary).
              // If no style: Blue (Primary).
              
              if (btn.style === 'destructive') {
                btnStyle = alertStyles.buttonDanger;
                textStyle = alertStyles.buttonTextPrimary;
              } else if (btn.style === 'cancel') {
                 btnStyle = alertStyles.buttonSecondary;
                 textStyle = alertStyles.buttonTextSecondary;
              } else {
                 btnStyle = alertStyles.buttonPrimary;
                 textStyle = alertStyles.buttonTextPrimary;
              }

              return (
                <TouchableOpacity
                  key={index}
                  style={[alertStyles.button, btnStyle]}
                  onPress={() => {
                    hide();
                    if (btn.onPress) btn.onPress();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={textStyle}>{btn.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// Singleton Helper thay thế Alert.alert
export const CustomAlert = {
  alert: (
    title: string,
    message?: string,
    buttons?: AlertButton[],
    options?: { type?: AlertType }
  ) => {
    // Auto-detect type based on title/content keywords if not provided
    let type: AlertType = options?.type || 'info';
    
    if (!options?.type) {
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('lỗi') || lowerTitle.includes('error') || lowerTitle.includes('fail') || lowerTitle.includes('thất bại')) {
            type = 'error';
        } else if (lowerTitle.includes('thành công') || lowerTitle.includes('success')) {
            type = 'success';
        } else if (lowerTitle.includes('cảnh báo') || lowerTitle.includes('xác nhận') || lowerTitle.includes('warning') || lowerTitle.includes('confirm') || lowerTitle.includes('chú ý')) {
            type = 'warning';
        }
    }

    useAlertStore.getState().show(title, message, buttons, type);
  },
};
