import React, { createContext, useContext, useState, useEffect } from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { CssBaseline, GlobalStyles } from '@mui/material';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const CustomThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);

  // Load theme preference from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('userSettings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setDarkMode(settings.darkMode || false);
      } catch (error) {
        console.error('Error loading theme settings:', error);
      }
    }
  }, []);

  // Listen for settings changes
  useEffect(() => {
    const handleStorageChange = () => {
      const savedSettings = localStorage.getItem('userSettings');
      if (savedSettings) {
        try {
          const settings = JSON.parse(savedSettings);
          setDarkMode(settings.darkMode || false);
        } catch (error) {
          console.error('Error loading theme settings:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const lightTheme = createTheme({
    palette: {
      mode: 'light',
      primary: {
        main: '#0A66C2',
        light: '#378FE9',
        dark: '#004182',
      },
      secondary: {
        main: '#4CAF50',
        light: '#66BB6A',
        dark: '#2E7D32',
      },
      info: {
        main: '#2196F3',
        light: '#64B5F6',
        dark: '#1976D2',
      },
      warning: {
        main: '#FF9800',
        light: '#FFB74D',
        dark: '#F57C00',
      },
      background: {
        default: '#ffffff',
        paper: '#ffffff',
      },
      text: {
        primary: '#333333',
        secondary: '#666666',
        disabled: '#999999',
      },
      divider: '#e0e0e0',
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: '#ffffff',
            color: '#333333',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: '#ffffff',
            color: '#333333',
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            color: '#333333',
            '&:hover': {
              backgroundColor: 'rgba(10, 102, 194, 0.04)',
            },
          },
        },
      },
    },
  });

  const darkTheme = createTheme({
    palette: {
      mode: 'dark',
      primary: {
        main: '#378FE9',
        light: '#64B5F6',
        dark: '#0A66C2',
      },
      secondary: {
        main: '#66BB6A',
        light: '#81C784',
        dark: '#4CAF50',
      },
      info: {
        main: '#64B5F6',
        light: '#90CAF9',
        dark: '#2196F3',
      },
      warning: {
        main: '#FFB74D',
        light: '#FFCC80',
        dark: '#FF9800',
      },
      background: {
        default: '#121212',
        paper: '#1e1e1e',
      },
      text: {
        primary: '#ffffff',
        secondary: '#b3b3b3',
        disabled: '#777777',
      },
      divider: '#444444',
    },
    components: {
      MuiAppBar: {
        styleOverrides: {
          root: {
            backgroundColor: '#1e1e1e',
            color: '#ffffff',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            backgroundColor: '#1e1e1e',
            backgroundImage: 'none',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundColor: '#2d2d2d',
            backgroundImage: 'none',
          },
        },
      },
      MuiMenu: {
        styleOverrides: {
          paper: {
            backgroundColor: '#2d2d2d',
            color: '#ffffff',
            border: '1px solid #378FE9',
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            color: '#ffffff',
            '&:hover': {
              backgroundColor: 'rgba(55, 143, 233, 0.1)',
            },
          },
        },
      },
      MuiListItemText: {
        styleOverrides: {
          primary: {
            color: '#ffffff',
          },
        },
      },
      MuiListItemIcon: {
        styleOverrides: {
          root: {
            color: '#378FE9',
          },
        },
      },
    },
  });

  const theme = darkMode ? darkTheme : lightTheme;

  const globalStyles = (
    <GlobalStyles
      styles={{
        '@keyframes pulse': {
          '0%': {
            boxShadow: '0 4px 12px rgba(255, 152, 0, 0.2)',
          },
          '50%': {
            boxShadow: '0 4px 20px rgba(255, 152, 0, 0.4)',
          },
          '100%': {
            boxShadow: '0 4px 12px rgba(255, 152, 0, 0.2)',
          },
        },
      }}
    />
  );

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    // Update localStorage
    const savedSettings = localStorage.getItem('userSettings');
    let settings = {};
    if (savedSettings) {
      try {
        settings = JSON.parse(savedSettings);
      } catch (error) {
        console.error('Error parsing settings:', error);
      }
    }
    
    settings.darkMode = newDarkMode;
    localStorage.setItem('userSettings', JSON.stringify(settings));
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {globalStyles}
        {children}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};
