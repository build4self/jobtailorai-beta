import { createTheme } from '@mui/material';

// Create LinkedIn-inspired theme
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0A66C2',
      light: '#378FE9',
      dark: '#004182',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#666666',
      light: '#8C8C8C',
      dark: '#404040',
      contrastText: '#ffffff',
    },
    background: {
      default: '#F3F2EF',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#000000',
      secondary: '#666666',
    },
  },
  typography: {
    fontFamily: '"Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
    h1: { fontWeight: 600, color: '#000000' },
    h2: { fontWeight: 600, color: '#000000' },
    h3: { fontWeight: 600, color: '#000000' },
    h4: { fontWeight: 600, color: '#000000' },
    h5: { fontWeight: 600, color: '#000000' },
    h6: { fontWeight: 600, color: '#000000' },
    body1: { color: '#000000', fontSize: '14px', lineHeight: 1.4 },
    body2: { color: '#666666', fontSize: '12px', lineHeight: 1.33 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          fontSize: '16px',
          padding: '8px 16px',
          borderRadius: '24px',
          boxShadow: 'none',
          '&:hover': { boxShadow: 'none' },
        },
        contained: {
          '&.MuiButton-containedPrimary': {
            background: '#0A66C2',
            color: '#ffffff',
            '&:hover': { background: '#004182' },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E0E0E0',
          boxShadow: '0 0 0 1px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.08)',
          borderRadius: '8px',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#FFFFFF',
          color: '#000000',
          boxShadow: '0 0 0 1px rgba(0,0,0,.08), 0 2px 4px rgba(0,0,0,.08)',
          borderBottom: 'none',
        },
      },
    },
  },
});
