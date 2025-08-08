import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { MainStackParamList } from '@navigation/MainNavigator';
import { useAppSelector } from '@hooks/redux';

type RouteProps = RouteProp<MainStackParamList, 'Conversation'>;

export default function ConversationScreen() {
  const route = useRoute<RouteProps>();
  const theme = useAppSelector((state) => state.theme.currentTheme);
  const { conversationId } = route.params;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.textColor }]}>Conversation</Text>
        <Text style={[styles.subtitle, { color: theme.secondaryTextColor }]}>
          ID: {conversationId}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
});