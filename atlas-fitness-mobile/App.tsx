import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Sentry from '@sentry/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StripeProvider } from '@stripe/stripe-react-native';
import { NetworkProvider } from 'react-native-offline';

import { store, persistor } from '@store/index';
import { useAppSelector } from '@hooks/redux';
import RootNavigator from '@navigation/RootNavigator';
import { supabase } from '@config/supabase';
import { loadUserData } from '@store/slices/authSlice';
import { setOrganizationTheme } from '@store/slices/themeSlice';
import NotificationHandler from '@components/common/NotificationHandler';
import OfflineSync from '@components/common/OfflineSync';
import ErrorBoundary from '@components/common/ErrorBoundary';
import LoadingScreen from '@components/common/LoadingScreen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Initialize Sentry
if (process.env.EXPO_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
    debug: __DEV__,
    environment: __DEV__ ? 'development' : 'production',
  });
}

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

function AppContent() {
  const theme = useAppSelector((state) => state.theme.currentTheme);
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);

  return (
    <PaperProvider theme={{
      ...theme,
      colors: {
        primary: theme.primaryColor,
        accent: theme.accentColor,
        background: theme.backgroundColor,
        surface: theme.surfaceColor,
        text: theme.textColor,
        error: theme.errorColor,
        notification: theme.accentColor,
        onSurface: theme.textColor,
        disabled: theme.secondaryTextColor,
        placeholder: theme.secondaryTextColor,
        backdrop: 'rgba(0, 0, 0, 0.5)',
        onBackground: theme.textColor,
        onPrimary: '#ffffff',
        onSecondary: '#ffffff',
        onError: '#ffffff',
        secondary: theme.secondaryColor,
      },
      dark: theme.backgroundColor === '#0f0f0f',
    }}>
      <StatusBar style={theme.backgroundColor === '#0f0f0f' ? 'light' : 'dark'} />
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
      <NotificationHandler />
      {isAuthenticated && <OfflineSync />}
    </PaperProvider>
  );
}

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Load fonts
        await Font.loadAsync({
          'Inter-Regular': require('./assets/fonts/Inter-Regular.ttf'),
          'Inter-Medium': require('./assets/fonts/Inter-Medium.ttf'),
          'Inter-SemiBold': require('./assets/fonts/Inter-SemiBold.ttf'),
          'Inter-Bold': require('./assets/fonts/Inter-Bold.ttf'),
        });

        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          store.dispatch(loadUserData(session.user.id));
        }

        // Listen for auth changes
        supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session) {
            store.dispatch(loadUserData(session.user.id));
          }
        });
      } catch (e) {
        console.warn(e);
      } finally {
        setIsReady(true);
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <Provider store={store}>
            <PersistGate loading={<LoadingScreen />} persistor={persistor}>
              <QueryClientProvider client={queryClient}>
                <NetworkProvider>
                  <StripeProvider
                    publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''}
                    merchantIdentifier="merchant.com.atlasfitness"
                  >
                    <AppContent />
                  </StripeProvider>
                </NetworkProvider>
              </QueryClientProvider>
            </PersistGate>
          </Provider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
