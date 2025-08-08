import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import WelcomeScreen from '@screens/auth/WelcomeScreen';
import SignInScreen from '@screens/auth/SignInScreen';
import VerifyOtpScreen from '@screens/auth/VerifyOtpScreen';
import CompleteProfileScreen from '@screens/auth/CompleteProfileScreen';

export type AuthStackParamList = {
  Welcome: undefined;
  SignIn: undefined;
  VerifyOtp: { email: string };
  CompleteProfile: { userId: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
      <Stack.Screen name="CompleteProfile" component={CompleteProfileScreen} />
    </Stack.Navigator>
  );
}