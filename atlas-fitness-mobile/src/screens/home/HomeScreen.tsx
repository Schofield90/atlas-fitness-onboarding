import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Card, Avatar, ProgressBar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { format } from 'date-fns';
import { useAppSelector, useAppDispatch } from '@hooks/redux';
import { fetchBookings } from '@store/slices/bookingsSlice';
import { MainStackParamList } from '@navigation/MainNavigator';
import { supabase } from '@config/supabase';
import { UserActivity } from '@types/index';

type NavigationProp = NativeStackNavigationProp<MainStackParamList, 'MainTabs'>;

export default function HomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const organization = useAppSelector((state) => state.auth.organization);
  const membership = useAppSelector((state) => state.auth.membership);
  const upcomingBookings = useAppSelector((state) => state.bookings.upcomingBookings);
  const theme = useAppSelector((state) => state.theme.currentTheme);
  
  const [refreshing, setRefreshing] = useState(false);
  const [activity, setActivity] = useState<UserActivity | null>(null);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    // Set greeting based on time of day
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good morning');
    } else if (hour < 17) {
      setGreeting('Good afternoon');
    } else {
      setGreeting('Good evening');
    }

    // Fetch initial data
    if (user) {
      dispatch(fetchBookings(user.id));
      fetchUserActivity();
    }
  }, [user]);

  const fetchUserActivity = async () => {
    if (!user) return;

    try {
      // Fetch check-ins for this week
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      startOfWeek.setHours(0, 0, 0, 0);

      const { data: checkIns, error } = await supabase
        .from('check_ins')
        .select('*')
        .eq('user_id', user.id)
        .gte('checked_in_at', startOfWeek.toISOString());

      if (error) throw error;

      // Calculate activity stats
      const weeklyCheckIns = checkIns?.length || 0;
      
      // Fetch all-time stats
      const { data: allCheckIns } = await supabase
        .from('check_ins')
        .select('checked_in_at')
        .eq('user_id', user.id)
        .order('checked_in_at', { ascending: false });

      const { data: classesAttended } = await supabase
        .from('class_bookings')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'attended');

      // Calculate streak
      let streak = 0;
      if (allCheckIns && allCheckIns.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        for (let i = 0; i < allCheckIns.length; i++) {
          const checkInDate = new Date(allCheckIns[i].checked_in_at);
          checkInDate.setHours(0, 0, 0, 0);
          
          const diffDays = Math.floor((today.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (diffDays === i) {
            streak++;
          } else {
            break;
          }
        }
      }

      setActivity({
        checkInsThisWeek: weeklyCheckIns,
        checkInsThisMonth: allCheckIns?.filter(ci => {
          const checkInDate = new Date(ci.checked_in_at);
          return checkInDate.getMonth() === new Date().getMonth();
        }).length || 0,
        classesAttended: classesAttended?.length || 0,
        averageCheckInTime: '6:30 AM', // TODO: Calculate from data
        favoriteClasses: [], // TODO: Calculate from bookings
        streak,
      });
    } catch (error) {
      console.error('Error fetching user activity:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (user) {
      await dispatch(fetchBookings(user.id));
      await fetchUserActivity();
    }
    setRefreshing(false);
  };

  const getMembershipStatus = () => {
    if (!membership) return { color: '#6b7280', text: 'No active membership' };
    
    const daysUntilExpiry = membership.endDate
      ? Math.floor((new Date(membership.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    if (membership.status === 'active') {
      if (daysUntilExpiry <= 7) {
        return { color: '#f59e0b', text: `Expires in ${daysUntilExpiry} days` };
      }
      return { color: '#10b981', text: 'Active' };
    }
    
    return { color: '#ef4444', text: membership.status };
  };

  const nextClass = upcomingBookings[0];
  const membershipStatus = getMembershipStatus();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <Avatar.Image
              size={48}
              source={
                user?.avatarUrl
                  ? { uri: user.avatarUrl }
                  : require('@assets/default-avatar.png')
              }
            />
            <View style={styles.greeting}>
              <Text style={[styles.greetingText, { color: theme.secondaryTextColor }]}>
                {greeting},
              </Text>
              <Text style={[styles.userName, { color: theme.textColor }]}>
                {user?.fullName || 'Member'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('Notifications')}
            style={styles.notificationButton}
          >
            <Ionicons name="notifications-outline" size={24} color={theme.textColor} />
          </TouchableOpacity>
        </View>

        {/* QR Code Card */}
        <Card style={[styles.qrCard, { backgroundColor: theme.surfaceColor }]}>
          <Text style={[styles.qrTitle, { color: theme.textColor }]}>
            Check In
          </Text>
          <View style={styles.qrContainer}>
            <QRCode
              value={`atlasfitness://checkin/${user?.id}/${organization?.id}`}
              size={200}
              backgroundColor={theme.surfaceColor}
              color={theme.textColor}
            />
          </View>
          <Text style={[styles.qrSubtitle, { color: theme.secondaryTextColor }]}>
            Show this code at the front desk
          </Text>
          <TouchableOpacity
            style={[styles.scanButton, { backgroundColor: theme.primaryColor }]}
            onPress={() => navigation.navigate('QRScanner')}
          >
            <Ionicons name="scan-outline" size={20} color="#ffffff" />
            <Text style={styles.scanButtonText}>Scan QR Code</Text>
          </TouchableOpacity>
        </Card>

        {/* Membership Status */}
        <Card style={[styles.membershipCard, { backgroundColor: theme.surfaceColor }]}>
          <View style={styles.membershipHeader}>
            <Text style={[styles.membershipTitle, { color: theme.textColor }]}>
              {membership?.membershipPlan?.name || 'Membership'}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: membershipStatus.color + '20' }]}>
              <Text style={[styles.statusText, { color: membershipStatus.color }]}>
                {membershipStatus.text}
              </Text>
            </View>
          </View>
          {membership && (
            <View style={styles.membershipDetails}>
              <Text style={[styles.membershipDetail, { color: theme.secondaryTextColor }]}>
                Member since {format(new Date(membership.startDate), 'MMM yyyy')}
              </Text>
              {membership.nextBillingDate && (
                <Text style={[styles.membershipDetail, { color: theme.secondaryTextColor }]}>
                  Next billing: {format(new Date(membership.nextBillingDate), 'MMM d, yyyy')}
                </Text>
              )}
            </View>
          )}
        </Card>

        {/* Next Class */}
        {nextClass && (
          <Card
            style={[styles.nextClassCard, { backgroundColor: theme.surfaceColor }]}
            onPress={() => navigation.navigate('ClassDetails', { classId: nextClass.classId })}
          >
            <View style={styles.nextClassHeader}>
              <Ionicons name="calendar-outline" size={24} color={theme.primaryColor} />
              <Text style={[styles.nextClassTitle, { color: theme.textColor }]}>
                Next Class
              </Text>
            </View>
            <Text style={[styles.nextClassName, { color: theme.textColor }]}>
              {nextClass.class.classType.name}
            </Text>
            <Text style={[styles.nextClassTime, { color: theme.secondaryTextColor }]}>
              {format(new Date(nextClass.class.startTime), 'EEEE, MMM d at h:mm a')}
            </Text>
            <Text style={[styles.nextClassInstructor, { color: theme.secondaryTextColor }]}>
              with {nextClass.class.instructor.user.fullName}
            </Text>
          </Card>
        )}

        {/* Activity Stats */}
        {activity && (
          <View style={styles.statsContainer}>
            <Text style={[styles.statsTitle, { color: theme.textColor }]}>
              Your Activity
            </Text>
            <View style={styles.statsGrid}>
              <Card style={[styles.statCard, { backgroundColor: theme.surfaceColor }]}>
                <Ionicons name="flame-outline" size={32} color={theme.primaryColor} />
                <Text style={[styles.statValue, { color: theme.textColor }]}>
                  {activity.streak}
                </Text>
                <Text style={[styles.statLabel, { color: theme.secondaryTextColor }]}>
                  Day Streak
                </Text>
              </Card>
              <Card style={[styles.statCard, { backgroundColor: theme.surfaceColor }]}>
                <Ionicons name="checkmark-circle-outline" size={32} color={theme.primaryColor} />
                <Text style={[styles.statValue, { color: theme.textColor }]}>
                  {activity.checkInsThisWeek}
                </Text>
                <Text style={[styles.statLabel, { color: theme.secondaryTextColor }]}>
                  This Week
                </Text>
              </Card>
              <Card style={[styles.statCard, { backgroundColor: theme.surfaceColor }]}>
                <Ionicons name="trophy-outline" size={32} color={theme.primaryColor} />
                <Text style={[styles.statValue, { color: theme.textColor }]}>
                  {activity.classesAttended}
                </Text>
                <Text style={[styles.statLabel, { color: theme.secondaryTextColor }]}>
                  Classes
                </Text>
              </Card>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.surfaceColor }]}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Schedule' })}
          >
            <Ionicons name="calendar" size={24} color={theme.primaryColor} />
            <Text style={[styles.actionText, { color: theme.textColor }]}>
              Book Class
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.surfaceColor }]}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Messages' })}
          >
            <Ionicons name="chatbubbles" size={24} color={theme.primaryColor} />
            <Text style={[styles.actionText, { color: theme.textColor }]}>
              Messages
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.surfaceColor }]}
            onPress={() => navigation.navigate('MainTabs', { screen: 'Membership' })}
          >
            <Ionicons name="card" size={24} color={theme.primaryColor} />
            <Text style={[styles.actionText, { color: theme.textColor }]}>
              Membership
            </Text>
          </TouchableOpacity>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 24,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  greeting: {
    marginLeft: 12,
  },
  greetingText: {
    fontSize: 14,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
  },
  notificationButton: {
    padding: 8,
  },
  qrCard: {
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 24,
    alignItems: 'center',
    elevation: 2,
  },
  qrTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  qrContainer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 16,
  },
  qrSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  scanButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 8,
  },
  membershipCard: {
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 20,
    elevation: 2,
  },
  membershipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  membershipTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  membershipDetails: {
    gap: 4,
  },
  membershipDetail: {
    fontSize: 14,
  },
  nextClassCard: {
    marginHorizontal: 24,
    marginBottom: 16,
    padding: 20,
    elevation: 2,
  },
  nextClassHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  nextClassTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  nextClassName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  nextClassTime: {
    fontSize: 14,
    marginBottom: 2,
  },
  nextClassInstructor: {
    fontSize: 14,
  },
  statsContainer: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  statsTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 4,
    borderRadius: 8,
    elevation: 2,
  },
  actionText: {
    fontSize: 12,
    marginTop: 8,
    fontWeight: '500',
  },
});