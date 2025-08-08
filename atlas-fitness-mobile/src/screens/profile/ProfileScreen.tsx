import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, List, Avatar, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from '@hooks/redux';
import { signOut } from '@store/slices/authSlice';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.theme.currentTheme);
  const user = useAppSelector((state) => state.auth.user);

  const handleSignOut = () => {
    dispatch(signOut());
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <ScrollView>
        <View style={styles.header}>
          <Avatar.Image
            size={80}
            source={
              user?.avatarUrl
                ? { uri: user.avatarUrl }
                : require('@assets/default-avatar.png')
            }
          />
          <Text style={[styles.name, { color: theme.textColor }]}>
            {user?.fullName || 'User'}
          </Text>
          <Text style={[styles.email, { color: theme.secondaryTextColor }]}>
            {user?.email}
          </Text>
        </View>

        <View style={styles.menu}>
          <List.Item
            title="Edit Profile"
            left={(props) => <List.Icon {...props} icon="account-edit" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('EditProfile')}
          />
          <List.Item
            title="Notifications"
            left={(props) => <List.Icon {...props} icon="bell" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('Notifications')}
          />
          <List.Item
            title="Settings"
            left={(props) => <List.Icon {...props} icon="cog" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            onPress={() => navigation.navigate('Settings')}
          />
        </View>

        <View style={styles.footer}>
          <Button
            mode="outlined"
            onPress={handleSignOut}
            style={styles.signOutButton}
            textColor={theme.errorColor}
          >
            Sign Out
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
  },
  menu: {
    paddingHorizontal: 16,
  },
  footer: {
    padding: 24,
  },
  signOutButton: {
    borderColor: '#ef4444',
  },
});