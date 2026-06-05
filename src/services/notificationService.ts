import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { logError } from './logger';

/**
 * إعدادات ظهور التنبيهات الافتراضية
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * خدمة التنبيهات المركزية - Masrofati Notification Service
 */
export const notificationService = {
  /**
   * طلب الإذن من المستخدم (استراتيجية الطلب عند الحاجة)
   */
  requestPermissions: async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn('تنبيه: المستخدم رفض إذن التنبيهات');
      return false;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#007acc',
      });
    }

    return true;
  },

  /**
   * إرسال تنبيه فوري
   * @param title - عنوان التنبيه
   * @param body - محتوى التنبيه
   * @param data - بيانات إضافية للربط (اختياري)
   */
  sendImmediateNotification: async (title: string, body: string, data: Record<string, any> = {}) => {
    try {
      const hasPermission = await notificationService.requestPermissions();
      if (!hasPermission) return null;

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: null, // إرسال فوراً
      });
      return id;
    } catch (error) {
      logError('notification_service', error, { context: 'sendImmediateNotification', title });
      return null;
    }
  },

  /**
   * جدولة تنبيه مستقبلي (مثلاً تذكير بالتسوق)
   * @param title 
   * @param body 
   * @param seconds - عدد الثواني بعد الآن
   */
  scheduleDelayedNotification: async (title: string, body: string, seconds: number, data: Record<string, any> = {}) => {
    try {
      const hasPermission = await notificationService.requestPermissions();
      if (!hasPermission) return null;

      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: true,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds,
        },
      });
      return id;
    } catch (error) {
      logError('notification_service', error, { context: 'scheduleDelayedNotification', title });
      return null;
    }
  },

  /**
   * إلغاء كافة التنبيهات المجدولة
   */
  cancelAllNotifications: async () => {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
};
