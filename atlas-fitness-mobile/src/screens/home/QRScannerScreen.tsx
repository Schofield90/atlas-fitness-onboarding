import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Camera, CameraView } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useAppSelector } from '@hooks/redux';
import { supabase } from '@config/supabase';
import { Constants } from '@config/constants';

export default function QRScannerScreen() {
  const navigation = useNavigation();
  const user = useAppSelector((state) => state.auth.user);
  const organization = useAppSelector((state) => state.auth.organization);
  const theme = useAppSelector((state) => state.theme.currentTheme);
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned || isProcessing) return;
    
    setScanned(true);
    setIsProcessing(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      // Parse QR code data
      // Expected format: atlasfitness://checkin/classId or atlasfitness://checkin/gym
      const url = new URL(data);
      
      if (url.protocol !== 'atlasfitness:' || url.hostname !== 'checkin') {
        throw new Error('Invalid QR code');
      }

      const pathParts = url.pathname.split('/').filter(Boolean);
      
      if (pathParts.length === 0) {
        // General gym check-in
        await handleGymCheckIn();
      } else {
        // Class check-in
        const classId = pathParts[0];
        await handleClassCheckIn(classId);
      }
    } catch (error: any) {
      Alert.alert(
        'Invalid QR Code',
        'This QR code is not valid for check-in.',
        [
          {
            text: 'Try Again',
            onPress: () => {
              setScanned(false);
              setIsProcessing(false);
            },
          },
        ]
      );
    }
  };

  const handleGymCheckIn = async () => {
    if (!user || !organization) return;

    try {
      // Check if already checked in
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: existingCheckIn } = await supabase
        .from('check_ins')
        .select('*')
        .eq('user_id', user.id)
        .eq('organization_id', organization.id)
        .gte('checked_in_at', today.toISOString())
        .is('checked_out_at', null)
        .single();

      if (existingCheckIn) {
        Alert.alert(
          'Already Checked In',
          'You are already checked in for today.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      // Create check-in record
      const { error } = await supabase
        .from('check_ins')
        .insert({
          user_id: user.id,
          organization_id: organization.id,
          type: 'qr',
          checked_in_at: new Date().toISOString(),
        });

      if (error) throw error;

      Alert.alert(
        'Check-In Successful!',
        Constants.SUCCESS.CHECK_IN,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert(
        'Check-In Failed',
        'Unable to complete check-in. Please try again.',
        [
          {
            text: 'Try Again',
            onPress: () => {
              setScanned(false);
              setIsProcessing(false);
            },
          },
        ]
      );
    }
  };

  const handleClassCheckIn = async (classId: string) => {
    if (!user || !organization) return;

    try {
      // Check if user has booking for this class
      const { data: booking, error: bookingError } = await supabase
        .from('class_bookings')
        .select('*')
        .eq('user_id', user.id)
        .eq('class_id', classId)
        .eq('status', 'confirmed')
        .single();

      if (bookingError || !booking) {
        Alert.alert(
          'No Booking Found',
          'You do not have a confirmed booking for this class.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
        return;
      }

      // Check if within check-in window
      const { data: classData } = await supabase
        .from('classes')
        .select('start_time')
        .eq('id', classId)
        .single();

      if (classData) {
        const classStartTime = new Date(classData.start_time);
        const now = new Date();
        const timeDiff = classStartTime.getTime() - now.getTime();

        if (timeDiff > Constants.BOOKING.CHECK_IN_WINDOW) {
          const minutesUntil = Math.floor(timeDiff / 60000);
          Alert.alert(
            'Too Early',
            `Check-in opens ${minutesUntil} minutes before class.`,
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          return;
        }

        if (timeDiff < -600000) { // 10 minutes after start
          Alert.alert(
            'Too Late',
            'Check-in has closed for this class.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
          return;
        }
      }

      // Update booking status
      const { error: updateError } = await supabase
        .from('class_bookings')
        .update({
          status: 'attended',
          checked_in_at: new Date().toISOString(),
        })
        .eq('id', booking.id);

      if (updateError) throw updateError;

      // Create check-in record
      const { error: checkInError } = await supabase
        .from('check_ins')
        .insert({
          user_id: user.id,
          organization_id: organization.id,
          type: 'class',
          class_id: classId,
          checked_in_at: new Date().toISOString(),
        });

      if (checkInError) throw checkInError;

      Alert.alert(
        'Class Check-In Successful!',
        'Enjoy your workout!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      Alert.alert(
        'Check-In Failed',
        'Unable to complete check-in. Please see the front desk.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
        <Text style={{ color: theme.textColor }}>Requesting camera permission...</Text>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
        <View style={styles.noPermission}>
          <Ionicons name="camera-off" size={64} color={theme.secondaryTextColor} />
          <Text style={[styles.noPermissionText, { color: theme.textColor }]}>
            Camera permission is required
          </Text>
          <Text style={[styles.noPermissionSubtext, { color: theme.secondaryTextColor }]}>
            Please enable camera access in your device settings to scan QR codes.
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.goBack()}
            style={styles.button}
          >
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      />
      
      <SafeAreaView style={styles.overlay}>
        <View style={styles.header}>
          <Button
            mode="text"
            onPress={() => navigation.goBack()}
            textColor="#ffffff"
            icon="close"
          >
            Close
          </Button>
        </View>

        <View style={styles.scanArea}>
          <View style={styles.corner} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>

        <View style={styles.instructions}>
          <Text style={styles.instructionText}>
            {isProcessing ? 'Processing...' : 'Position QR code within the frame'}
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  scanArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#ffffff',
    borderTopWidth: 4,
    borderLeftWidth: 4,
    top: '30%',
    left: '15%',
  },
  topRight: {
    borderTopWidth: 4,
    borderLeftWidth: 0,
    borderRightWidth: 4,
    left: 'auto',
    right: '15%',
  },
  bottomLeft: {
    borderTopWidth: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    top: 'auto',
    bottom: '30%',
  },
  bottomRight: {
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    top: 'auto',
    bottom: '30%',
    left: 'auto',
    right: '15%',
  },
  instructions: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  instructionText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
  },
  noPermission: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  noPermissionText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  noPermissionSubtext: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    marginTop: 16,
  },
});