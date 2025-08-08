import React, { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useNavigation } from '@react-navigation/native';
import { useAppDispatch, useAppSelector } from '@hooks/redux';
import { addNotification, registerForPushNotifications } from '@store/slices/notificationsSlice';
import { supabase } from '@config/supabase';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export default function NotificationHandler() {
  const dispatch = useAppDispatch();
  const navigation = useNavigation<any>();
  const user = useAppSelector((state) => state.auth.user);
  const notificationListener = useRef<any>();
  const responseListener = useRef<any>();

  useEffect(() => {
    if (!user) return;

    // Register for push notifications
    dispatch(registerForPushNotifications());

    // Handle notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      const { title, body, data } = notification.request.content;
      
      // Add to store
      dispatch(addNotification({
        id: notification.request.identifier,
        userId: user.id,
        title: title || '',
        body: body || '',
        type: data?.type || 'announcement',
        data: data || {},
        read: false,
        createdAt: new Date().toISOString(),
      }));
    });

    // Handle notification response (user taps on notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const { data } = response.notification.request.content;
      
      // Navigate based on notification type
      switch (data?.type) {
        case 'class-reminder':
          if (data.classId) {
            navigation.navigate('ClassDetails', { classId: data.classId });
          }
          break;
        case 'booking-confirmed':
          if (data.bookingId) {
            navigation.navigate('BookingConfirmation', { bookingId: data.bookingId });
          }
          break;
        case 'message':
          if (data.conversationId) {
            navigation.navigate('Conversation', { conversationId: data.conversationId });
          }
          break;
        case 'membership-expiring':
          navigation.navigate('Membership');
          break;
        default:
          navigation.navigate('Notifications');
      }
    });

    // Subscribe to realtime notifications
    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // Schedule local notification
          Notifications.scheduleNotificationAsync({
            content: {
              title: payload.new.title,
              body: payload.new.body,
              data: payload.new.data || {},
            },
            trigger: null, // Show immediately
          });
          
          // Add to store
          dispatch(addNotification(payload.new as any));
        }
      )
      .subscribe();

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
      subscription.unsubscribe();
    };
  }, [user, dispatch, navigation]);

  // Handle app state changes for badge updates
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && Platform.OS === 'ios') {
        // Clear badge when app becomes active
        Notifications.setBadgeCountAsync(0);
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return null;
}