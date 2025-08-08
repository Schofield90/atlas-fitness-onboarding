import React, { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useAppDispatch, useAppSelector } from '@hooks/redux';
import { 
  setOnlineStatus, 
  setSyncInProgress, 
  removePendingAction, 
  incrementRetryCount,
  loadPendingActions,
  clearOldActions
} from '@store/slices/offlineSlice';
import { bookClass, cancelBooking } from '@store/slices/bookingsSlice';
import { sendMessage } from '@store/slices/messagesSlice';
import { updateProfile } from '@store/slices/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Constants } from '@config/constants';

export default function OfflineSync() {
  const dispatch = useAppDispatch();
  const { isOnline, pendingActions, syncInProgress } = useAppSelector((state) => state.offline);
  const user = useAppSelector((state) => state.auth.user);
  const appState = useRef(AppState.currentState);

  // Monitor network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      dispatch(setOnlineStatus(state.isConnected ?? false));
    });

    return unsubscribe;
  }, [dispatch]);

  // Load pending actions from storage on mount
  useEffect(() => {
    const loadActions = async () => {
      try {
        const stored = await AsyncStorage.getItem(Constants.STORAGE.OFFLINE_QUEUE);
        if (stored) {
          dispatch(loadPendingActions(JSON.parse(stored)));
        }
      } catch (error) {
        console.error('Failed to load pending actions:', error);
      }
    };

    loadActions();
  }, [dispatch]);

  // Clear old actions periodically
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch(clearOldActions());
    }, 24 * 60 * 60 * 1000); // Once per day

    return () => clearInterval(interval);
  }, [dispatch]);

  // Sync pending actions when online
  useEffect(() => {
    if (!isOnline || !user || syncInProgress || pendingActions.length === 0) {
      return;
    }

    const syncActions = async () => {
      dispatch(setSyncInProgress(true));

      for (const action of pendingActions) {
        try {
          switch (action.type) {
            case 'booking':
              await dispatch(bookClass({
                classId: action.data.classId,
                userId: user.id,
              })).unwrap();
              break;

            case 'cancellation':
              await dispatch(cancelBooking({
                bookingId: action.data.bookingId,
                classId: action.data.classId,
              })).unwrap();
              break;

            case 'message':
              await dispatch(sendMessage({
                conversationId: action.data.conversationId,
                senderId: user.id,
                content: action.data.content,
                type: action.data.type || 'text',
              })).unwrap();
              break;

            case 'profile-update':
              await dispatch(updateProfile(action.data)).unwrap();
              break;
          }

          // Remove successful action
          dispatch(removePendingAction(action.id));
        } catch (error) {
          console.error(`Failed to sync action ${action.id}:`, error);
          dispatch(incrementRetryCount(action.id));

          // Remove action if too many retries
          if (action.retryCount >= 3) {
            dispatch(removePendingAction(action.id));
          }
        }
      }

      dispatch(setSyncInProgress(false));
    };

    syncActions();
  }, [isOnline, user, pendingActions, syncInProgress, dispatch]);

  // Sync when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active' &&
        isOnline &&
        pendingActions.length > 0
      ) {
        // Trigger sync
        dispatch(setSyncInProgress(false)); // Reset to trigger sync
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, [isOnline, pendingActions, dispatch]);

  return null;
}