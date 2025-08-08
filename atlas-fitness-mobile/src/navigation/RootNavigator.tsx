import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppSelector } from '@hooks/redux';

import AuthNavigator from './AuthNavigator';
import MainNavigator from './MainNavigator';
import OrganizationSelectorScreen from '@screens/auth/OrganizationSelectorScreen';

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  OrganizationSelector: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const organization = useAppSelector((state) => state.auth.organization);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      ) : !organization ? (
        <Stack.Screen name="OrganizationSelector" component={OrganizationSelectorScreen} />
      ) : (
        <Stack.Screen name="Main" component={MainNavigator} />
      )}
    </Stack.Navigator>
  );
}