import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, List, Switch } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppSelector, useAppDispatch } from '@hooks/redux';
import { toggleTheme } from '@store/slices/themeSlice';

export default function SettingsScreen() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.theme.currentTheme);
  const isDarkMode = useAppSelector((state) => state.theme.isDarkMode);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <View style={styles.content}>
        <List.Section>
          <List.Subheader>Appearance</List.Subheader>
          <List.Item
            title="Dark Mode"
            description="Use dark theme"
            left={(props) => <List.Icon {...props} icon="theme-light-dark" />}
            right={() => (
              <Switch
                value={isDarkMode}
                onValueChange={() => dispatch(toggleTheme())}
              />
            )}
          />
        </List.Section>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});