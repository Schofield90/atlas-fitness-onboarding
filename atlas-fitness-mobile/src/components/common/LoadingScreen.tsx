import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Text } from 'react-native-paper';
import { useAppSelector } from '@hooks/redux';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message }: LoadingScreenProps) {
  const theme = useAppSelector((state) => state.theme.currentTheme);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <ActivityIndicator size="large" color={theme.primaryColor} />
      {message && (
        <Text style={[styles.message, { color: theme.textColor }]}>{message}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    marginTop: 16,
    fontSize: 16,
  },
});