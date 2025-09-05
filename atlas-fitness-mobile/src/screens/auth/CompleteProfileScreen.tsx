import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, TextInput, Button, Avatar, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { useAppDispatch } from '@hooks/redux';
import { updateProfile } from '@store/slices/authSlice';
import { AuthStackParamList } from '@navigation/AuthNavigator';
import { Constants } from '@config/constants';
import { supabase } from '@config/supabase';

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'CompleteProfile'>;
type RouteProps = RouteProp<AuthStackParamList, 'CompleteProfile'>;

export default function CompleteProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProps>();
  const dispatch = useAppDispatch();
  
  const [loading, setLoading] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string>('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { userId } = route.params;

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      alert('Sorry, we need camera roll permissions to upload a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const uploadAvatar = async (uri: string): Promise<string | null> => {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const fileExt = uri.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(fileName, blob);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading avatar:', error);
      return null;
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    } else if (fullName.length > Constants.VALIDATION.MAX_NAME_LENGTH) {
      newErrors.fullName = `Name must be less than ${Constants.VALIDATION.MAX_NAME_LENGTH} characters`;
    }

    if (phoneNumber && !Constants.VALIDATION.PHONE_REGEX.test(phoneNumber)) {
      newErrors.phoneNumber = 'Please enter a valid phone number';
    }

    if (emergencyPhone && !Constants.VALIDATION.PHONE_REGEX.test(emergencyPhone)) {
      newErrors.emergencyPhone = 'Please enter a valid emergency contact phone';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleComplete = async () => {
    if (!validate()) return;

    setLoading(true);

    try {
      let avatarUrl: string | null = null;
      if (avatarUri) {
        avatarUrl = await uploadAvatar(avatarUri);
      }

      const profileData: any = {
        full_name: fullName,
        phone_number: phoneNumber || null,
        date_of_birth: dateOfBirth?.toISOString() || null,
        avatar_url: avatarUrl,
      };

      if (emergencyName && emergencyPhone) {
        profileData.emergency_contact = {
          name: emergencyName,
          phone: emergencyPhone,
          relationship: emergencyRelationship,
        };
      }

      await dispatch(updateProfile(profileData)).unwrap();
      // Navigation will be handled by RootNavigator
    } catch (error: any) {
      setErrors({ submit: error.message || 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.title}>Complete Your Profile</Text>
            <Text style={styles.subtitle}>
              Let's get to know you better
            </Text>
          </View>

          <View style={styles.avatarContainer}>
            <Avatar.Image
              size={100}
              source={avatarUri ? { uri: avatarUri } : require('@assets/default-avatar.png')}
            />
            <IconButton
              icon="camera"
              size={24}
              onPress={pickImage}
              style={styles.cameraButton}
              iconColor="#ffffff"
            />
          </View>

          <View style={styles.form}>
            <TextInput
              label="Full Name *"
              value={fullName}
              onChangeText={setFullName}
              style={styles.input}
              mode="outlined"
              error={!!errors.fullName}
              theme={{
                colors: {
                  primary: '#f59e0b',
                  background: '#1a1a1a',
                  surface: '#2d2d2d',
                  text: '#ffffff',
                  placeholder: '#9ca3af',
                }
              }}
            />
            {errors.fullName && (
              <Text style={styles.errorText}>{errors.fullName}</Text>
            )}

            <TextInput
              label="Phone Number"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              keyboardType="phone-pad"
              style={styles.input}
              mode="outlined"
              error={!!errors.phoneNumber}
              theme={{
                colors: {
                  primary: '#f59e0b',
                  background: '#1a1a1a',
                  surface: '#2d2d2d',
                  text: '#ffffff',
                  placeholder: '#9ca3af',
                }
              }}
            />
            {errors.phoneNumber && (
              <Text style={styles.errorText}>{errors.phoneNumber}</Text>
            )}

            <Button
              mode="outlined"
              onPress={() => setShowDatePicker(true)}
              style={styles.dateButton}
              contentStyle={styles.dateButtonContent}
              labelStyle={styles.dateButtonLabel}
            >
              {dateOfBirth
                ? format(dateOfBirth, 'dd/MM/yyyy')
                : 'Select Date of Birth'}
            </Button>

            {showDatePicker && (
              <DateTimePicker
                value={dateOfBirth || new Date()}
                mode="date"
                display="default"
                locale={Platform.OS === 'ios' ? 'en_GB' : undefined}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setDateOfBirth(selectedDate);
                  }
                }}
                maximumDate={new Date()}
              />
            )}

            <Text style={styles.sectionTitle}>Emergency Contact</Text>

            <TextInput
              label="Contact Name"
              value={emergencyName}
              onChangeText={setEmergencyName}
              style={styles.input}
              mode="outlined"
              theme={{
                colors: {
                  primary: '#f59e0b',
                  background: '#1a1a1a',
                  surface: '#2d2d2d',
                  text: '#ffffff',
                  placeholder: '#9ca3af',
                }
              }}
            />

            <TextInput
              label="Contact Phone"
              value={emergencyPhone}
              onChangeText={setEmergencyPhone}
              keyboardType="phone-pad"
              style={styles.input}
              mode="outlined"
              error={!!errors.emergencyPhone}
              theme={{
                colors: {
                  primary: '#f59e0b',
                  background: '#1a1a1a',
                  surface: '#2d2d2d',
                  text: '#ffffff',
                  placeholder: '#9ca3af',
                }
              }}
            />
            {errors.emergencyPhone && (
              <Text style={styles.errorText}>{errors.emergencyPhone}</Text>
            )}

            <TextInput
              label="Relationship"
              value={emergencyRelationship}
              onChangeText={setEmergencyRelationship}
              style={styles.input}
              mode="outlined"
              theme={{
                colors: {
                  primary: '#f59e0b',
                  background: '#1a1a1a',
                  surface: '#2d2d2d',
                  text: '#ffffff',
                  placeholder: '#9ca3af',
                }
              }}
            />

            {errors.submit && (
              <Text style={styles.errorText}>{errors.submit}</Text>
            )}

            <Button
              mode="contained"
              onPress={handleComplete}
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              Complete Profile
            </Button>

            <Button
              mode="text"
              onPress={handleComplete}
              disabled={loading}
              style={styles.skipButton}
              labelStyle={styles.skipButtonLabel}
            >
              Skip for now
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  header: {
    marginTop: 24,
    marginBottom: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
    lineHeight: 24,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 32,
    position: 'relative',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: '35%',
    backgroundColor: '#f59e0b',
  },
  form: {
    flex: 1,
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#2d2d2d',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: -12,
    marginBottom: 12,
  },
  dateButton: {
    marginBottom: 24,
    borderColor: '#374151',
  },
  dateButtonContent: {
    height: 56,
  },
  dateButtonLabel: {
    color: '#ffffff',
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
    marginTop: 8,
  },
  button: {
    backgroundColor: '#f59e0b',
    borderRadius: 8,
    marginTop: 24,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    marginTop: 12,
  },
  skipButtonLabel: {
    color: '#9ca3af',
  },
});