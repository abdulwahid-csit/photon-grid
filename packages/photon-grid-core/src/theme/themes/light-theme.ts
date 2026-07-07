import type { Theme } from '../../types/theme.types';

export const lightTheme: Theme = {
  name: 'light',
  displayName: 'Light',
  mode: 'light',
  tokens: {
    colors: {
      primary: '#2563eb',
      primaryHover: '#1d4ed8',
      primaryActive: '#1e40af',
      primaryText: '#ffffff',

      secondary: '#64748b',
      secondaryHover: '#475569',

      surface: '#ffffff',
      surfaceRaised: '#ffffff',
      surfaceOverlay: '#ffffff',
      surfaceSunken: '#f8fafc',

      background: '#f8fafc',
      backgroundAlt: '#f1f5f9',

      border: '#e2e8f0',
      borderStrong: '#cbd5e1',
      borderFocus: '#2563eb',

      textPrimary: '#0f172a',
      textSecondary: '#475569',
      textDisabled: '#94a3b8',
      textInverse: '#ffffff',

      headerBackground: '#f8fafc',
      headerText: '#374151',
      headerBorder: '#e2e8f0',
      headerHover: '#f1f5f9',

      rowBackground: '#ffffff',
      rowBackgroundAlt: '#f8fafc',
      rowHover: '#f0f7ff',
      rowSelected: '#eff6ff',
      rowSelectedBorder: '#bfdbfe',

      cellEditBackground: '#ffffff',
      cellEditBorder: '#2563eb',

      selectionBackground: 'rgba(37, 99, 235, 0.08)',
      selectionBorder: 'rgba(37, 99, 235, 0.85)',
      selectionCorner: '#2563eb',

      footerBackground: '#f8fafc',
      footerText: '#374151',
      footerBorder: '#e2e8f0',

      pinnedBackground: '#ffffff',
      pinnedShadow: '4px 0 6px -2px rgba(15,23,42,0.08)',

      filterBackground: '#ffffff',
      filterBorder: '#e2e8f0',
      filterActiveBackground: '#eff6ff',
      filterActiveBorder: '#93c5fd',

      scrollbarTrack: '#f1f5f9',
      scrollbarThumb: '#cbd5e1',
      scrollbarThumbHover: '#94a3b8',

      resizeHandleColor: '#e2e8f0',
      resizeHandleActiveColor: '#2563eb',

      dragPreviewBackground: '#ffffff',
      dragPreviewBorder: '#e2e8f0',
      dragOverHighlight: 'rgba(37, 99, 235, 0.06)',

      checkboxBackground: '#ffffff',
      checkboxCheckedBackground: '#2563eb',
      checkboxBorder: '#cbd5e1',

      badgeBackground: '#eff6ff',
      badgeText: '#1d4ed8',

      groupRowBackground: '#f8fafc',
      groupRowBorder: '#e2e8f0',

      tooltipBackground: '#1e293b',
      tooltipText: '#f1f5f9',

      success: '#16a34a',
      warning: '#d97706',
      error: '#dc2626',
      info: '#0284c7',

      successLight: '#dcfce7',
      warningLight: '#fef3c7',
      errorLight: '#fee2e2',
      infoLight: '#e0f2fe',
      
    },
    typography: {
      fontFamily: "'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif",
      fontFamilyMono: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      fontSizeXs: '11px',
      fontSizeSm: '12px',
      fontSizeMd: '13px',
      fontSizeLg: '14px',
      fontSizeXl: '16px',
      fontWeightRegular: '400',
      fontWeightMedium: '500',
      fontWeightSemiBold: '600',
      fontWeightBold: '700',
      lineHeightTight: '1.2',
      lineHeightBase: '1.5',
      lineHeightRelaxed: '1.75',
      letterSpacingTight: '-0.01em',
      letterSpacingBase: '0',
      letterSpacingWide: '0.025em',
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '12px',
      lg: '16px',
      xl: '24px',
      xxl: '32px',
    },
    sizing: {
      rowHeightSm: '36px',
      rowHeightMd: '48px',
      rowHeightLg: '60px',
      headerRowHeight: '42px',
      footerRowHeight: '44px',
      filterRowHeight: '36px',
      scrollbarWidth: '8px',
      resizeHandleWidth: '4px',
      columnMinWidth: '40px',
      checkboxSize: '16px',
      iconSizeSm: '14px',
      iconSizeMd: '16px',
      iconSizeLg: '20px',
    },
    borders: {
      radiusSm: '4px',
      radiusMd: '6px',
      radiusLg: '8px',
      radiusPill: '9999px',
      widthThin: '1px',
      widthBase: '1px',
      widthThick: '2px',
      styleBase: 'solid',
    },
    shadows: {
      none: 'none',
      xs: '0 1px 2px rgba(15,23,42,0.05)',
      sm: '0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.06)',
      md: '0 4px 6px -1px rgba(15,23,42,0.08), 0 2px 4px -2px rgba(15,23,42,0.05)',
      lg: '0 10px 15px -3px rgba(15,23,42,0.08), 0 4px 6px -4px rgba(15,23,42,0.05)',
      pinnedLeft: '4px 0 8px -2px rgba(15,23,42,0.10)',
      pinnedRight: '-4px 0 8px -2px rgba(15,23,42,0.10)',
      dropdown: '0 8px 24px rgba(15,23,42,0.12), 0 2px 8px rgba(15,23,42,0.08)',
      tooltip: '0 4px 12px rgba(15,23,42,0.15)',
      dragPreview: '0 8px 24px rgba(15,23,42,0.18), 0 2px 8px rgba(15,23,42,0.10)',
    },
    transitions: {
      durationFast: '100ms',
      durationBase: '150ms',
      durationSlow: '250ms',
      easingBase: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easingDecelerate: 'cubic-bezier(0, 0, 0.2, 1)',
      easingAccelerate: 'cubic-bezier(0.4, 0, 1, 1)',
    },
  },
};
