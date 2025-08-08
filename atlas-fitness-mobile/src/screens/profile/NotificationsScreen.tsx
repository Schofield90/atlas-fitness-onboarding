import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text, List } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector } from '@hooks/redux';

export default function NotificationsScreen() {
  const theme = useAppSelector((state) => state.theme.currentTheme);
  const notifications = useAppSelector((state) => state.notifications.notifications);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.textColor }]}>No notifications</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <List.Item
              title={item.title}
              description={item.body}
              titleStyle={{ fontWeight: item.read ? 'normal' : 'bold' }}
              left={(props) => (
                <List.Icon
                  {...props}
                  icon={item.read ? 'email-open' : 'email'}
                  color={item.read ? theme.secondaryTextColor : theme.primaryColor}
                />
              )}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});