import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector } from '@hooks/redux';

export default function MembershipScreen() {
  const navigation = useNavigation();
  const theme = useAppSelector((state) => state.theme.currentTheme);
  const membership = useAppSelector((state) => state.auth.membership);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <ScrollView>
        <View style={styles.content}>
          <Card style={[styles.card, { backgroundColor: theme.surfaceColor }]}>
            <Card.Content>
              <Text style={[styles.title, { color: theme.textColor }]}>
                {membership?.membershipPlan?.name || 'No Active Membership'}
              </Text>
              <Text style={[styles.status, { color: theme.secondaryTextColor }]}>
                Status: {membership?.status || 'Inactive'}
              </Text>
            </Card.Content>
          </Card>
          
          <Button
            mode="contained"
            onPress={() => navigation.navigate('PaymentMethods')}
            style={styles.button}
          >
            Manage Payment Methods
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
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  status: {
    fontSize: 16,
  },
  button: {
    marginTop: 16,
  },
});