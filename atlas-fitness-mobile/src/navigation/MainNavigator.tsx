import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '@hooks/redux';

// Tab Screens
import HomeScreen from '@screens/home/HomeScreen';
import ScheduleScreen from '@screens/schedule/ScheduleScreen';
import MembershipScreen from '@screens/membership/MembershipScreen';
import MessagesScreen from '@screens/messaging/MessagesScreen';
import ProfileScreen from '@screens/profile/ProfileScreen';

// Stack Screens
import ClassDetailsScreen from '@screens/schedule/ClassDetailsScreen';
import BookingConfirmationScreen from '@screens/schedule/BookingConfirmationScreen';
import QRScannerScreen from '@screens/home/QRScannerScreen';
import PaymentMethodsScreen from '@screens/membership/PaymentMethodsScreen';
import ConversationScreen from '@screens/messaging/ConversationScreen';
import EditProfileScreen from '@screens/profile/EditProfileScreen';
import NotificationsScreen from '@screens/profile/NotificationsScreen';
import SettingsScreen from '@screens/profile/SettingsScreen';

export type MainTabParamList = {
  Home: undefined;
  Schedule: undefined;
  Membership: undefined;
  Messages: undefined;
  Profile: undefined;
};

export type MainStackParamList = {
  MainTabs: undefined;
  ClassDetails: { classId: string };
  BookingConfirmation: { bookingId: string };
  QRScanner: undefined;
  PaymentMethods: undefined;
  Conversation: { conversationId: string };
  EditProfile: undefined;
  Notifications: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();
const Stack = createNativeStackNavigator<MainStackParamList>();

function MainTabs() {
  const theme = useAppSelector((state) => state.theme.currentTheme);
  const unreadMessages = useAppSelector((state) => state.messages.unreadCount);
  const unreadNotifications = useAppSelector((state) => state.notifications.unreadCount);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = 'home';

          switch (route.name) {
            case 'Home':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Schedule':
              iconName = focused ? 'calendar' : 'calendar-outline';
              break;
            case 'Membership':
              iconName = focused ? 'card' : 'card-outline';
              break;
            case 'Messages':
              iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
              break;
            case 'Profile':
              iconName = focused ? 'person' : 'person-outline';
              break;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.primaryColor,
        tabBarInactiveTintColor: theme.secondaryTextColor,
        tabBarStyle: {
          backgroundColor: theme.backgroundColor,
          borderTopColor: theme.borderColor,
        },
        headerStyle: {
          backgroundColor: theme.backgroundColor,
        },
        headerTintColor: theme.textColor,
        headerShadowVisible: false,
      })}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: 'Home',
        }}
      />
      <Tab.Screen
        name="Schedule"
        component={ScheduleScreen}
        options={{
          title: 'Classes',
        }}
      />
      <Tab.Screen
        name="Membership"
        component={MembershipScreen}
        options={{
          title: 'Membership',
        }}
      />
      <Tab.Screen
        name="Messages"
        component={MessagesScreen}
        options={{
          title: 'Messages',
          tabBarBadge: unreadMessages > 0 ? unreadMessages : undefined,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarBadge: unreadNotifications > 0 ? unreadNotifications : undefined,
        }}
      />
    </Tab.Navigator>
  );
}

export default function MainNavigator() {
  const theme = useAppSelector((state) => state.theme.currentTheme);

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.backgroundColor,
        },
        headerTintColor: theme.textColor,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="MainTabs"
        component={MainTabs}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ClassDetails"
        component={ClassDetailsScreen}
        options={{ title: 'Class Details' }}
      />
      <Stack.Screen
        name="BookingConfirmation"
        component={BookingConfirmationScreen}
        options={{ title: 'Booking Confirmed' }}
      />
      <Stack.Screen
        name="QRScanner"
        component={QRScannerScreen}
        options={{ title: 'Check In' }}
      />
      <Stack.Screen
        name="PaymentMethods"
        component={PaymentMethodsScreen}
        options={{ title: 'Payment Methods' }}
      />
      <Stack.Screen
        name="Conversation"
        component={ConversationScreen}
        options={{ title: 'Messages' }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: 'Edit Profile' }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Stack.Navigator>
  );
}