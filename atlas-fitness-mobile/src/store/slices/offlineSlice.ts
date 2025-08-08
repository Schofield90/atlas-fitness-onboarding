import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Constants } from '@config/constants';

interface OfflineAction {
  id: string;
  type: 'booking' | 'cancellation' | 'message' | 'profile-update';
  data: any;
  timestamp: string;
  retryCount: number;
}

interface OfflineState {
  isOnline: boolean;
  pendingActions: OfflineAction[];
  syncInProgress: boolean;
  lastSyncTime: string | null;
}

const initialState: OfflineState = {
  isOnline: true,
  pendingActions: [],
  syncInProgress: false,
  lastSyncTime: null,
};

const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    setOnlineStatus: (state, action: PayloadAction<boolean>) => {
      state.isOnline = action.payload;
      if (action.payload && state.pendingActions.length > 0) {
        // Trigger sync when coming back online
        state.syncInProgress = true;
      }
    },
    addPendingAction: (state, action: PayloadAction<Omit<OfflineAction, 'id' | 'timestamp' | 'retryCount'>>) => {
      const newAction: OfflineAction = {
        ...action.payload,
        id: `${Date.now()}_${Math.random().toString(36).substring(7)}`,
        timestamp: new Date().toISOString(),
        retryCount: 0,
      };
      state.pendingActions.push(newAction);
      
      // Persist to AsyncStorage
      AsyncStorage.setItem(
        Constants.STORAGE.OFFLINE_QUEUE,
        JSON.stringify(state.pendingActions)
      );
    },
    removePendingAction: (state, action: PayloadAction<string>) => {
      state.pendingActions = state.pendingActions.filter((a) => a.id !== action.payload);
      
      // Update AsyncStorage
      AsyncStorage.setItem(
        Constants.STORAGE.OFFLINE_QUEUE,
        JSON.stringify(state.pendingActions)
      );
    },
    incrementRetryCount: (state, action: PayloadAction<string>) => {
      const actionItem = state.pendingActions.find((a) => a.id === action.payload);
      if (actionItem) {
        actionItem.retryCount += 1;
      }
    },
    setSyncInProgress: (state, action: PayloadAction<boolean>) => {
      state.syncInProgress = action.payload;
    },
    setLastSyncTime: (state, action: PayloadAction<string>) => {
      state.lastSyncTime = action.payload;
    },
    loadPendingActions: (state, action: PayloadAction<OfflineAction[]>) => {
      state.pendingActions = action.payload;
    },
    clearOldActions: (state) => {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      
      state.pendingActions = state.pendingActions.filter(
        (action) => new Date(action.timestamp) > oneWeekAgo
      );
      
      // Update AsyncStorage
      AsyncStorage.setItem(
        Constants.STORAGE.OFFLINE_QUEUE,
        JSON.stringify(state.pendingActions)
      );
    },
  },
});

export const {
  setOnlineStatus,
  addPendingAction,
  removePendingAction,
  incrementRetryCount,
  setSyncInProgress,
  setLastSyncTime,
  loadPendingActions,
  clearOldActions,
} = offlineSlice.actions;

export default offlineSlice.reducer;