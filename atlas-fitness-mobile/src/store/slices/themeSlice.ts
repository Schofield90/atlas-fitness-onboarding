import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppTheme } from '@types/index';
import { Constants } from '@config/constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ThemeState {
  isDarkMode: boolean;
  currentTheme: AppTheme;
  organizationTheme: AppTheme | null;
}

const initialState: ThemeState = {
  isDarkMode: false,
  currentTheme: Constants.DEFAULT_THEME,
  organizationTheme: null,
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    toggleTheme: (state) => {
      state.isDarkMode = !state.isDarkMode;
      state.currentTheme = state.isDarkMode ? Constants.DARK_THEME : Constants.DEFAULT_THEME;
      
      // Apply organization colors if available
      if (state.organizationTheme) {
        state.currentTheme = {
          ...state.currentTheme,
          primaryColor: state.organizationTheme.primaryColor,
          secondaryColor: state.organizationTheme.secondaryColor,
          accentColor: state.organizationTheme.accentColor,
        };
      }
      
      // Save theme preference
      AsyncStorage.setItem(Constants.STORAGE.THEME_KEY, JSON.stringify(state.isDarkMode));
    },
    setOrganizationTheme: (state, action: PayloadAction<Partial<AppTheme>>) => {
      state.organizationTheme = {
        ...Constants.DEFAULT_THEME,
        ...action.payload,
      };
      
      // Apply organization colors to current theme
      state.currentTheme = {
        ...state.currentTheme,
        primaryColor: action.payload.primaryColor || state.currentTheme.primaryColor,
        secondaryColor: action.payload.secondaryColor || state.currentTheme.secondaryColor,
        accentColor: action.payload.accentColor || state.currentTheme.accentColor,
      };
    },
    loadThemePreference: (state, action: PayloadAction<boolean>) => {
      state.isDarkMode = action.payload;
      state.currentTheme = state.isDarkMode ? Constants.DARK_THEME : Constants.DEFAULT_THEME;
      
      // Apply organization colors if available
      if (state.organizationTheme) {
        state.currentTheme = {
          ...state.currentTheme,
          primaryColor: state.organizationTheme.primaryColor,
          secondaryColor: state.organizationTheme.secondaryColor,
          accentColor: state.organizationTheme.accentColor,
        };
      }
    },
  },
});

export const { toggleTheme, setOrganizationTheme, loadThemePreference } = themeSlice.actions;
export default themeSlice.reducer;