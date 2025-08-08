import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { supabase } from '@config/supabase';
import { Class, ClassType } from '@types/index';
import { format, startOfWeek, endOfWeek } from 'date-fns';

interface ClassesState {
  classes: Class[];
  classTypes: ClassType[];
  selectedDate: string;
  isLoading: boolean;
  error: string | null;
  filters: {
    classTypeId?: string;
    instructorId?: string;
    level?: string;
    timeOfDay?: 'morning' | 'afternoon' | 'evening';
  };
}

const initialState: ClassesState = {
  classes: [],
  classTypes: [],
  selectedDate: new Date().toISOString(),
  isLoading: false,
  error: null,
  filters: {},
};

export const fetchClasses = createAsyncThunk(
  'classes/fetchClasses',
  async ({ organizationId, date }: { organizationId: string; date: string }) => {
    const startDate = startOfWeek(new Date(date));
    const endDate = endOfWeek(new Date(date));

    const { data, error } = await supabase
      .from('classes')
      .select(`
        *,
        class_types(*),
        instructors(*, users(*))
      `)
      .eq('organization_id', organizationId)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .order('start_time', { ascending: true });

    if (error) throw error;

    return data.map((item) => ({
      ...item,
      classType: item.class_types,
      instructor: {
        ...item.instructors,
        user: item.instructors.users,
      },
    }));
  }
);

export const fetchClassTypes = createAsyncThunk(
  'classes/fetchClassTypes',
  async (organizationId: string) => {
    const { data, error } = await supabase
      .from('class_types')
      .select('*')
      .eq('organization_id', organizationId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data;
  }
);

export const searchClasses = createAsyncThunk(
  'classes/searchClasses',
  async ({ organizationId, query }: { organizationId: string; query: string }) => {
    const { data, error } = await supabase
      .from('classes')
      .select(`
        *,
        class_types(*),
        instructors(*, users(*))
      `)
      .eq('organization_id', organizationId)
      .or(`class_types.name.ilike.%${query}%,instructors.users.full_name.ilike.%${query}%`)
      .gte('start_time', new Date().toISOString())
      .limit(20);

    if (error) throw error;

    return data.map((item) => ({
      ...item,
      classType: item.class_types,
      instructor: {
        ...item.instructors,
        user: item.instructors.users,
      },
    }));
  }
);

const classesSlice = createSlice({
  name: 'classes',
  initialState,
  reducers: {
    setSelectedDate: (state, action: PayloadAction<string>) => {
      state.selectedDate = action.payload;
    },
    setFilters: (state, action: PayloadAction<typeof initialState.filters>) => {
      state.filters = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch classes
      .addCase(fetchClasses.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchClasses.fulfilled, (state, action) => {
        state.isLoading = false;
        state.classes = action.payload;
      })
      .addCase(fetchClasses.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch classes';
      })
      // Fetch class types
      .addCase(fetchClassTypes.fulfilled, (state, action) => {
        state.classTypes = action.payload;
      })
      // Search classes
      .addCase(searchClasses.fulfilled, (state, action) => {
        state.classes = action.payload;
      });
  },
});

export const { setSelectedDate, setFilters, clearFilters } = classesSlice.actions;
export default classesSlice.reducer;