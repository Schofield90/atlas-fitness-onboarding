import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, Card, Chip, Searchbar, FAB, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfWeek, addDays, isSameDay } from 'date-fns';
import { useAppSelector, useAppDispatch } from '@hooks/redux';
import { fetchClasses, setSelectedDate, setFilters } from '@store/slices/classesSlice';
import { MainStackParamList } from '@navigation/MainNavigator';
import { Class } from '@types/index';

type NavigationProp = NativeStackNavigationProp<MainStackParamList, 'MainTabs'>;

export default function ScheduleScreen() {
  const navigation = useNavigation<NavigationProp>();
  const dispatch = useAppDispatch();
  const theme = useAppSelector((state) => state.theme.currentTheme);
  const organization = useAppSelector((state) => state.auth.organization);
  const { classes, selectedDate, isLoading, filters } = useAppSelector((state) => state.classes);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const startDate = startOfWeek(new Date(selectedDate));
    return addDays(startDate, i);
  });

  useEffect(() => {
    if (organization) {
      dispatch(fetchClasses({ 
        organizationId: organization.id, 
        date: selectedDate 
      }));
    }
  }, [organization, selectedDate]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (organization) {
      await dispatch(fetchClasses({ 
        organizationId: organization.id, 
        date: selectedDate 
      }));
    }
    setRefreshing(false);
  };

  const filteredClasses = classes.filter((cls) => {
    // Filter by selected date
    if (!isSameDay(new Date(cls.startTime), new Date(selectedDate))) {
      return false;
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        cls.classType.name.toLowerCase().includes(query) ||
        cls.instructor.user.fullName.toLowerCase().includes(query)
      );
    }

    // Apply other filters
    if (filters.classTypeId && cls.classTypeId !== filters.classTypeId) {
      return false;
    }
    if (filters.instructorId && cls.instructorId !== filters.instructorId) {
      return false;
    }
    if (filters.level && cls.classType.level !== filters.level) {
      return false;
    }

    return true;
  });

  const renderClass = ({ item }: { item: Class }) => {
    const startTime = new Date(item.startTime);
    const endTime = new Date(item.endTime);
    const isFull = item.currentParticipants >= item.maxParticipants;
    const spotsLeft = item.maxParticipants - item.currentParticipants;

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('ClassDetails', { classId: item.id })}
      >
        <Card style={[styles.classCard, { backgroundColor: theme.surfaceColor }]}>
          <View style={styles.classContent}>
            <View style={styles.timeContainer}>
              <Text style={[styles.startTime, { color: theme.textColor }]}>
                {format(startTime, 'h:mm')}
              </Text>
              <Text style={[styles.endTime, { color: theme.secondaryTextColor }]}>
                {format(endTime, 'h:mm a')}
              </Text>
            </View>
            
            <View style={styles.classInfo}>
              <Text style={[styles.className, { color: theme.textColor }]}>
                {item.classType.name}
              </Text>
              <Text style={[styles.instructor, { color: theme.secondaryTextColor }]}>
                with {item.instructor.user.fullName}
              </Text>
              <View style={styles.classDetails}>
                <Chip
                  mode="flat"
                  style={[styles.chip, { backgroundColor: theme.backgroundColor }]}
                  textStyle={{ fontSize: 12 }}
                >
                  {item.classType.duration} min
                </Chip>
                <Chip
                  mode="flat"
                  style={[styles.chip, { backgroundColor: theme.backgroundColor }]}
                  textStyle={{ fontSize: 12 }}
                >
                  {item.classType.level}
                </Chip>
                {item.classType.calories && (
                  <Chip
                    mode="flat"
                    style={[styles.chip, { backgroundColor: theme.backgroundColor }]}
                    textStyle={{ fontSize: 12 }}
                  >
                    {item.classType.calories} cal
                  </Chip>
                )}
              </View>
            </View>
            
            <View style={styles.bookingInfo}>
              <Text
                style={[
                  styles.spotsText,
                  { color: isFull ? theme.errorColor : theme.successColor }
                ]}
              >
                {isFull ? 'Full' : `${spotsLeft} spots`}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.secondaryTextColor}
              />
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderDaySelector = () => (
    <View style={styles.daySelector}>
      {weekDays.map((day) => {
        const isSelected = isSameDay(day, new Date(selectedDate));
        return (
          <TouchableOpacity
            key={day.toISOString()}
            style={[
              styles.dayButton,
              isSelected && { backgroundColor: theme.primaryColor }
            ]}
            onPress={() => dispatch(setSelectedDate(day.toISOString()))}
          >
            <Text
              style={[
                styles.dayName,
                { color: isSelected ? '#ffffff' : theme.secondaryTextColor }
              ]}
            >
              {format(day, 'EEE')}
            </Text>
            <Text
              style={[
                styles.dayNumber,
                { color: isSelected ? '#ffffff' : theme.textColor }
              ]}
            >
              {format(day, 'd')}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.backgroundColor }]}>
      <Searchbar
        placeholder="Search classes or instructors..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={[styles.searchBar, { backgroundColor: theme.surfaceColor }]}
        inputStyle={{ color: theme.textColor }}
        iconColor={theme.secondaryTextColor}
        placeholderTextColor={theme.secondaryTextColor}
      />

      {renderDaySelector()}

      {isLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primaryColor} />
        </View>
      ) : (
        <FlatList
          data={filteredClasses}
          renderItem={renderClass}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.classList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={64} color={theme.secondaryTextColor} />
              <Text style={[styles.emptyText, { color: theme.textColor }]}>
                No classes scheduled
              </Text>
              <Text style={[styles.emptySubtext, { color: theme.secondaryTextColor }]}>
                Check back later or try a different day
              </Text>
            </View>
          }
        />
      )}

      <FAB
        icon="filter"
        style={[styles.fab, { backgroundColor: theme.primaryColor }]}
        onPress={() => setShowFilters(true)}
        label={Object.keys(filters).length > 0 ? 'Filtered' : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    margin: 16,
    elevation: 0,
  },
  daySelector: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  dayButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
  },
  dayName: {
    fontSize: 12,
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  classList: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  classCard: {
    marginBottom: 12,
    elevation: 2,
  },
  classContent: {
    flexDirection: 'row',
    padding: 16,
  },
  timeContainer: {
    marginRight: 16,
    alignItems: 'center',
  },
  startTime: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  endTime: {
    fontSize: 12,
    marginTop: 2,
  },
  classInfo: {
    flex: 1,
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  instructor: {
    fontSize: 14,
    marginBottom: 8,
  },
  classDetails: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    height: 24,
  },
  bookingInfo: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
  spotsText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});