import { createTheme } from '@mui/material/styles'

/** Shared admin component foundation. Public QR pages retain their independent styles. */
export const adminTheme = createTheme({
  palette: {
    primary: { main: '#10765f', dark: '#075944', contrastText: '#ffffff' },
    secondary: { main: '#536b5b' },
    text: { primary: '#213b30', secondary: '#64746a' },
    background: { default: '#f6f8f6', paper: '#ffffff' },
    divider: '#e1e8e1',
    error: { main: '#b34435' },
  },
  typography: {
    fontFamily: '"DM Sans Variable", sans-serif',
    fontSize: 13,
    button: { textTransform: 'none', fontWeight: 650, fontSize: '0.8125rem' },
    h6: { fontFamily: '"Manrope Variable", sans-serif', fontWeight: 700, fontSize: '1rem' },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          minHeight: 42,
          paddingInline: 16,
          borderRadius: 8,
          '&.Mui-focusVisible': { outline: '3px solid #91c3b1', outlineOffset: 3 },
        },
        outlined: {
          borderColor: '#d9e3da',
          color: '#405d4b',
          '&:hover': { background: '#f3f7f1', borderColor: '#9ab8a1' },
        },
      },
    },
    MuiTextField: { defaultProps: { fullWidth: true, size: 'small', variant: 'outlined' } },
    MuiFormControl: { defaultProps: { fullWidth: true, size: 'small' } },
    MuiInputLabel: { styleOverrides: { root: { fontSize: 15 } } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: '#fff',
          fontSize: 13,
          minHeight: 44,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#dbe4da' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#8ba994' },
          '&.Mui-focused': { boxShadow: '0 0 0 3px #e8f2ec' },
          '&.MuiInputBase-multiline .MuiInputBase-input': { padding: 0 },
        },
        input: { padding: '12px 14px' },
        multiline: { padding: '12px 14px' },
      },
    },
    MuiFormHelperText: {
      styleOverrides: { root: { fontSize: 11, lineHeight: 1.6, marginLeft: 0 } },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: { fontSize: 13, minHeight: 42, whiteSpace: 'normal', overflowWrap: 'anywhere' },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          border: '1px solid #e1e8e1',
          backgroundImage: 'none',
          maxHeight: 'calc(100dvh - 32px)',
          margin: 16,
          width: 'calc(100% - 32px)',
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          padding: '20px 24px',
          borderBottom: '1px solid #e1e8e1',
          fontFamily: '"Manrope Variable", sans-serif',
          fontWeight: 700,
          fontSize: 16,
        },
      },
    },
    MuiDialogContent: { styleOverrides: { root: { padding: 24, minWidth: 0 } } },
    MuiDialogActions: {
      styleOverrides: { root: { padding: '16px 24px', borderTop: '1px solid #e1e8e1', gap: 8 } },
    },
    MuiIconButton: {
      styleOverrides: {
        root: { '&.Mui-focusVisible': { outline: '3px solid #91c3b1', outlineOffset: 2 } },
      },
    },
  },
})
