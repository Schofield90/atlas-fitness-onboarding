import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { combineReducers } from 'redux';

import authReducer from './slices/authSlice';
import themeReducer from './slices/themeSlice';
import classesReducer from './slices/classesSlice';
import bookingsReducer from './slices/bookingsSlice';
import messagesReducer from './slices/messagesSlice';
import notificationsReducer from './slices/notificationsSlice';
import offlineReducer from './slices/offlineSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  theme: themeReducer,
  classes: classesReducer,
  bookings: bookingsReducer,
  messages: messagesReducer,
  notifications: notificationsReducer,
  offline: offlineReducer,
});

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['auth', 'theme', 'offline'], // Only persist these reducers
  blacklist: ['classes', 'bookings', 'messages', 'notifications'], // Don't persist these
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;