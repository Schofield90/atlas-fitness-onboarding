import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '@config/supabase';
import { User, Organization, Membership } from '@types/index';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Constants } from '@config/constants';

interface AuthState {
  user: User | null;
  organization: Organization | null;
  membership: Membership | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  organization: null,
  membership: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,
};

// Async thunks
export const signInWithEmail = createAsyncThunk(
  'auth/signInWithEmail',
  async ({ email }: { email: string }) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
      },
    });

    if (error) throw error;
    return { email };
  }
);

export const verifyOtp = createAsyncThunk(
  'auth/verifyOtp',
  async ({ email, token }: { email: string; token: string }) => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'email',
    });

    if (error) throw error;

    // Fetch user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user!.id)
      .single();

    if (userError) throw userError;

    return { user: userData, session: data.session };
  }
);

export const signInWithApple = createAsyncThunk(
  'auth/signInWithApple',
  async () => {
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: '', // This will be handled by expo-apple-authentication
    });

    if (error) throw error;
    return data;
  }
);

export const signInWithGoogle = createAsyncThunk(
  'auth/signInWithGoogle',
  async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'atlasfitness://auth',
      },
    });

    if (error) throw error;
    return data;
  }
);

export const loadUserData = createAsyncThunk(
  'auth/loadUserData',
  async (userId: string) => {
    // Fetch user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    // Fetch user's organizations
    const { data: userOrgs, error: orgError } = await supabase
      .from('user_organizations')
      .select('*, organizations(*)')
      .eq('user_id', userId);

    if (orgError) throw orgError;

    // For now, select the first organization
    const organization = userOrgs?.[0]?.organizations || null;

    // Fetch active membership
    const { data: membershipData, error: membershipError } = await supabase
      .from('memberships')
      .select('*, membership_plans(*)')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    let membership = null;
    if (!membershipError && membershipData) {
      membership = {
        ...membershipData,
        membershipPlan: membershipData.membership_plans,
      };
    }

    return { user: userData, organization, membership };
  }
);

export const signOut = createAsyncThunk(
  'auth/signOut',
  async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Clear stored data
    await AsyncStorage.multiRemove([
      Constants.AUTH.TOKEN_KEY,
      Constants.AUTH.REFRESH_TOKEN_KEY,
      Constants.AUTH.USER_KEY,
      Constants.AUTH.ORG_KEY,
    ]);
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (updates: Partial<User>) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setOrganization: (state, action: PayloadAction<Organization>) => {
      state.organization = action.payload;
    },
    setMembership: (state, action: PayloadAction<Membership>) => {
      state.membership = action.payload;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Sign in with email
      .addCase(signInWithEmail.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signInWithEmail.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(signInWithEmail.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to send magic link';
      })
      // Verify OTP
      .addCase(verifyOtp.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Invalid verification code';
      })
      // Load user data
      .addCase(loadUserData.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadUserData.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.organization = action.payload.organization;
        state.membership = action.payload.membership;
        state.isAuthenticated = true;
      })
      .addCase(loadUserData.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load user data';
      })
      // Sign out
      .addCase(signOut.fulfilled, (state) => {
        return initialState;
      })
      // Update profile
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      });
  },
});

export const { setOrganization, setMembership, clearError } = authSlice.actions;
export default authSlice.reducer;