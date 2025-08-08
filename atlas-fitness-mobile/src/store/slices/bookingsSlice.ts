import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '@config/supabase';
import { ClassBooking } from '@types/index';
import { Constants } from '@config/constants';

interface BookingsState {
  bookings: ClassBooking[];
  upcomingBookings: ClassBooking[];
  pastBookings: ClassBooking[];
  isLoading: boolean;
  error: string | null;
}

const initialState: BookingsState = {
  bookings: [],
  upcomingBookings: [],
  pastBookings: [],
  isLoading: false,
  error: null,
};

export const fetchBookings = createAsyncThunk(
  'bookings/fetchBookings',
  async (userId: string) => {
    const { data, error } = await supabase
      .from('class_bookings')
      .select(`
        *,
        classes(
          *,
          class_types(*),
          instructors(*, users(*))
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map((booking) => ({
      ...booking,
      class: {
        ...booking.classes,
        classType: booking.classes.class_types,
        instructor: {
          ...booking.classes.instructors,
          user: booking.classes.instructors.users,
        },
      },
    }));
  }
);

export const bookClass = createAsyncThunk(
  'bookings/bookClass',
  async ({ classId, userId }: { classId: string; userId: string }) => {
    // Check if already booked
    const { data: existingBooking } = await supabase
      .from('class_bookings')
      .select('*')
      .eq('user_id', userId)
      .eq('class_id', classId)
      .single();

    if (existingBooking) {
      throw new Error('You have already booked this class');
    }

    // Check class capacity
    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('max_participants, current_participants')
      .eq('id', classId)
      .single();

    if (classError) throw classError;

    const status = classData.current_participants < classData.max_participants ? 'confirmed' : 'waitlisted';

    // Create booking
    const { data, error } = await supabase
      .from('class_bookings')
      .insert({
        user_id: userId,
        class_id: classId,
        status,
      })
      .select()
      .single();

    if (error) throw error;

    // Update class participant count if confirmed
    if (status === 'confirmed') {
      await supabase
        .from('classes')
        .update({ current_participants: classData.current_participants + 1 })
        .eq('id', classId);
    }

    return data;
  }
);

export const cancelBooking = createAsyncThunk(
  'bookings/cancelBooking',
  async ({ bookingId, classId }: { bookingId: string; classId: string }) => {
    // Check cancellation window
    const { data: booking, error: bookingError } = await supabase
      .from('class_bookings')
      .select('*, classes(start_time)')
      .eq('id', bookingId)
      .single();

    if (bookingError) throw bookingError;

    const classStartTime = new Date(booking.classes.start_time);
    const now = new Date();
    const timeDiff = classStartTime.getTime() - now.getTime();

    if (timeDiff < Constants.BOOKING.CANCELLATION_WINDOW) {
      throw new Error('Cancellation window has passed');
    }

    // Cancel booking
    const { error } = await supabase
      .from('class_bookings')
      .update({ status: 'cancelled' })
      .eq('id', bookingId);

    if (error) throw error;

    // Update class participant count if was confirmed
    if (booking.status === 'confirmed') {
      const { data: classData } = await supabase
        .from('classes')
        .select('current_participants')
        .eq('id', classId)
        .single();

      await supabase
        .from('classes')
        .update({ current_participants: Math.max(0, classData.current_participants - 1) })
        .eq('id', classId);

      // Move waitlisted user if any
      const { data: waitlistedBooking } = await supabase
        .from('class_bookings')
        .select('*')
        .eq('class_id', classId)
        .eq('status', 'waitlisted')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (waitlistedBooking) {
        await supabase
          .from('class_bookings')
          .update({ status: 'confirmed' })
          .eq('id', waitlistedBooking.id);
      }
    }

    return bookingId;
  }
);

export const checkInToClass = createAsyncThunk(
  'bookings/checkInToClass',
  async ({ bookingId, userId, organizationId }: { bookingId: string; userId: string; organizationId: string }) => {
    // Update booking status
    const { error: bookingError } = await supabase
      .from('class_bookings')
      .update({ 
        status: 'attended',
        checked_in_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (bookingError) throw bookingError;

    // Create check-in record
    const { data, error } = await supabase
      .from('check_ins')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        type: 'class',
        checked_in_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return data;
  }
);

const bookingsSlice = createSlice({
  name: 'bookings',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch bookings
      .addCase(fetchBookings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBookings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.bookings = action.payload;
        
        const now = new Date();
        state.upcomingBookings = action.payload.filter(
          (booking) => 
            new Date(booking.class.startTime) > now && 
            ['confirmed', 'waitlisted'].includes(booking.status)
        );
        state.pastBookings = action.payload.filter(
          (booking) => 
            new Date(booking.class.startTime) <= now || 
            ['cancelled', 'attended', 'no-show'].includes(booking.status)
        );
      })
      .addCase(fetchBookings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch bookings';
      })
      // Book class
      .addCase(bookClass.fulfilled, (state) => {
        // Will refetch bookings after successful booking
        state.error = null;
      })
      .addCase(bookClass.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to book class';
      })
      // Cancel booking
      .addCase(cancelBooking.fulfilled, (state, action) => {
        state.bookings = state.bookings.map((booking) =>
          booking.id === action.payload
            ? { ...booking, status: 'cancelled' }
            : booking
        );
        state.error = null;
      })
      .addCase(cancelBooking.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to cancel booking';
      });
  },
});

export const { clearError } = bookingsSlice.actions;
export default bookingsSlice.reducer;