import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { MainStackParamList } from '@navigation/MainNavigator';
import { useAppSelector } from '@hooks/redux';

type RouteProps = RouteProp<MainStackParamList, 'ClassDetails'>;

export default function ClassDetailsScreen() {
  const route = useRoute<RouteProps>();
  const navigation = useNavigation();
  const theme = useAppSelector((state) => state.theme.currentTheme);
  const { classId } = route.params;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <ScrollView>
        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.textColor }]}>Class Details</Text>
          <Text style={[styles.subtitle, { color: theme.secondaryTextColor }]}>
            Class ID: {classId}
          </Text>
          
          <Button
            mode="contained"
            onPress={() => navigation.navigate('BookingConfirmation', { bookingId: '123' })}
            style={styles.button}
          >
            Book Class
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
    marginBottom: 24,
  },
  button: {
    marginTop: 16,
  },
});