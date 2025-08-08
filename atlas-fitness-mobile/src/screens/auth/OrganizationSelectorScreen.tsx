import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { Text, Card, Avatar, Searchbar, ActivityIndicator } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '@hooks/redux';
import { setOrganization } from '@store/slices/authSlice';
import { setOrganizationTheme } from '@store/slices/themeSlice';
import { supabase } from '@config/supabase';
import { Organization } from '@types/index';

export default function OrganizationSelectorScreen() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.auth.user);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [filteredOrgs, setFilteredOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [showJoinCode, setShowJoinCode] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = organizations.filter((org) =>
        org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.address.city.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredOrgs(filtered);
    } else {
      setFilteredOrgs(organizations);
    }
  }, [searchQuery, organizations]);

  const fetchOrganizations = async () => {
    try {
      // Fetch user's organizations
      const { data: userOrgs, error: userOrgsError } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user?.id);

      if (userOrgsError) throw userOrgsError;

      // Fetch organization details
      if (userOrgs && userOrgs.length > 0) {
        const orgIds = userOrgs.map((uo) => uo.organization_id);
        const { data: orgsData, error: orgsError } = await supabase
          .from('organizations')
          .select('*')
          .in('id', orgIds);

        if (orgsError) throw orgsError;
        setOrganizations(orgsData || []);
        setFilteredOrgs(orgsData || []);
      }

      // If no organizations, show popular ones
      if (!userOrgs || userOrgs.length === 0) {
        const { data: popularOrgs, error: popularError } = await supabase
          .from('organizations')
          .select('*')
          .limit(10);

        if (popularError) throw popularError;
        setOrganizations(popularOrgs || []);
        setFilteredOrgs(popularOrgs || []);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectOrganization = async (org: Organization) => {
    // Set organization in Redux
    dispatch(setOrganization(org));
    
    // Set organization theme
    dispatch(setOrganizationTheme({
      primaryColor: org.primaryColor,
      secondaryColor: org.secondaryColor,
      accentColor: org.accentColor,
    }));

    // Create user-organization relationship if doesn't exist
    if (user) {
      const { error } = await supabase
        .from('user_organizations')
        .upsert({
          user_id: user.id,
          organization_id: org.id,
          role: 'member',
        });

      if (error) {
        console.error('Error joining organization:', error);
      }
    }
  };

  const joinWithCode = async () => {
    if (!joinCode.trim()) return;

    setLoading(true);
    try {
      // Find organization by join code (slug)
      const { data: org, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('slug', joinCode.toLowerCase())
        .single();

      if (error || !org) {
        alert('Invalid organization code');
        return;
      }

      await selectOrganization(org);
    } catch (error) {
      alert('Failed to join organization');
    } finally {
      setLoading(false);
    }
  };

  const renderOrganization = ({ item }: { item: Organization }) => (
    <TouchableOpacity onPress={() => selectOrganization(item)}>
      <Card style={styles.card}>
        <View style={styles.cardContent}>
          <Avatar.Image
            size={60}
            source={
              item.logoUrl
                ? { uri: item.logoUrl }
                : require('@assets/default-gym-logo.png')
            }
          />
          <View style={styles.cardText}>
            <Text style={styles.orgName}>{item.name}</Text>
            <Text style={styles.orgAddress}>
              {item.address.city}, {item.address.state}
            </Text>
            <View style={styles.features}>
              {item.features.classBooking && (
                <View style={styles.featureTag}>
                  <Text style={styles.featureText}>Classes</Text>
                </View>
              )}
              {item.features.personalTraining && (
                <View style={styles.featureTag}>
                  <Text style={styles.featureText}>PT</Text>
                </View>
              )}
              {item.features.onlineClasses && (
                <View style={styles.featureTag}>
                  <Text style={styles.featureText}>Online</Text>
                </View>
              )}
            </View>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#9ca3af" />
        </View>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#f59e0b" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Your Gym</Text>
        <Text style={styles.subtitle}>
          Choose your gym to access your membership
        </Text>
      </View>

      <Searchbar
        placeholder="Search gyms..."
        onChangeText={setSearchQuery}
        value={searchQuery}
        style={styles.searchBar}
        inputStyle={styles.searchInput}
        iconColor="#9ca3af"
        placeholderTextColor="#9ca3af"
      />

      {showJoinCode ? (
        <View style={styles.joinCodeContainer}>
          <TextInput
            style={styles.joinCodeInput}
            placeholder="Enter gym code"
            placeholderTextColor="#9ca3af"
            value={joinCode}
            onChangeText={setJoinCode}
            autoCapitalize="none"
          />
          <TouchableOpacity style={styles.joinButton} onPress={joinWithCode}>
            <Text style={styles.joinButtonText}>Join</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.joinCodeToggle}
          onPress={() => setShowJoinCode(true)}
        >
          <Text style={styles.joinCodeToggleText}>Have a gym code?</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={filteredOrgs}
        renderItem={renderOrganization}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={64} color="#6b7280" />
            <Text style={styles.emptyText}>No gyms found</Text>
            <Text style={styles.emptySubtext}>
              Try searching for a different location or use a gym code
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
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
  searchBar: {
    marginHorizontal: 24,
    marginBottom: 16,
    backgroundColor: '#2d2d2d',
    elevation: 0,
  },
  searchInput: {
    color: '#ffffff',
  },
  joinCodeToggle: {
    alignItems: 'center',
    marginBottom: 16,
  },
  joinCodeToggleText: {
    color: '#f59e0b',
    fontSize: 14,
    fontWeight: '600',
  },
  joinCodeContainer: {
    flexDirection: 'row',
    marginHorizontal: 24,
    marginBottom: 16,
  },
  joinCodeInput: {
    flex: 1,
    height: 48,
    backgroundColor: '#2d2d2d',
    borderRadius: 8,
    paddingHorizontal: 16,
    color: '#ffffff',
    fontSize: 16,
  },
  joinButton: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 24,
    justifyContent: 'center',
    borderRadius: 8,
    marginLeft: 12,
  },
  joinButtonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  list: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#2d2d2d',
    marginBottom: 12,
    elevation: 0,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  cardText: {
    flex: 1,
    marginLeft: 16,
  },
  orgName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  orgAddress: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 8,
  },
  features: {
    flexDirection: 'row',
    gap: 8,
  },
  featureTag: {
    backgroundColor: '#374151',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  featureText: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});