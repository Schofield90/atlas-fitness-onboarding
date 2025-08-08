import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '@hooks/redux';

export default function BookingConfirmationScreen() {
  const navigation = useNavigation();
  const theme = useAppSelector((state) => state.theme.currentTheme);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.textColor }]}>Booking Confirmed!</Text>
        <Text style={[styles.subtitle, { color: theme.secondaryTextColor }]}>
          Your class has been booked successfully.
        </Text>
        
        <Button
          mode="contained"
          onPress={() => navigation.navigate('MainTabs', { screen: 'Home' })}
          style={styles.button}
        >
          Back to Home
        </Button>
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
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    marginTop: 16,
  },
});