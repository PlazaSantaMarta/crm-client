import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { checkAuthStatus } from '../store/slices/authSlice';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Toolbar,
  Typography,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Contacts as ContactsIcon,
  Sync as SyncIcon,
  LockOutlined as LockIcon,
} from '@mui/icons-material';

const drawerWidth = 260;

function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  
  // Obtener estado de autenticación de Redux
  const { isAuthenticated } = useSelector((state) => state.auth);
  
  // Verificar también tokens directamente para máxima compatibilidad
  const [isUserAuthenticated, setIsUserAuthenticated] = useState(false);
  
  // Verificar estado de autenticación al cargar
  useEffect(() => {
    dispatch(checkAuthStatus());
    
    // Verificar tokens directamente
    const hasGoogleToken = localStorage.getItem('googleToken') !== null;
    const hasKommoToken = localStorage.getItem('kommoToken') !== null;
    const hasToken = localStorage.getItem('token') !== null;
    
    // Usuario autenticado si tiene cualquiera de los tokens
    setIsUserAuthenticated(hasGoogleToken || hasKommoToken || hasToken || isAuthenticated);
  }, [dispatch, isAuthenticated]);
  
  // Determinar qué elementos del menú mostrar
  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/', always: true },
    { text: 'Contactos', icon: <ContactsIcon />, path: '/contacts', visible: isUserAuthenticated },
    { text: 'Sincronización', icon: <SyncIcon />, path: '/sync', visible: isUserAuthenticated },
  ];

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleMenuClick = (path) => {
    navigate(path);
    setMobileOpen(false);
  };

  const drawer = (
    <Box
      sx={{
        height: '100%',
        background: 'linear-gradient(180deg, #5c33f6 0%, #1a000d 100%)',
        color: '#e0e0ff',
        display: 'flex',
        flexDirection: 'column',
        paddingTop: 2,
      }}
    >
      <Toolbar sx={{ justifyContent: 'center', mb: 2 }}>
        <Typography variant="h5" fontWeight="bold" sx={{ letterSpacing: 2 }}>
          Kommo Bot
        </Typography>
      </Toolbar>
      <List sx={{ flexGrow: 1 }}>
        {menuItems
          .filter(item => item.always || item.visible)
          .map((item) => (
            <ListItemButton
              key={item.text}
              onClick={() => handleMenuClick(item.path)}
              selected={location.pathname === item.path}
              sx={{
                mb: 1,
                borderRadius: 1,
                mx: 1,
                transition: 'background-color 0.3s, transform 0.2s ease',
                transform: 'translateY(0)',
                '&.Mui-selected': {
                  backgroundColor: '#7b59f9',
                  color: '#fff',
                  transform: 'translateY(-3px)',
                  '& .MuiListItemIcon-root': {
                    color: '#fff',
                  },
                },
                '&:hover': {
                  backgroundColor: '#7b59f9cc',
                  color: '#fff',
                  transform: 'translateY(-3px)',
                  '& .MuiListItemIcon-root': {
                    color: '#fff',
                  },
                },
              }}
            >
              <ListItemIcon
                sx={{ 
                  color: location.pathname === item.path ? '#fff' : '#cfcfff',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          ))}
      </List>
      <Box sx={{ p: 2, textAlign: 'center', fontSize: '0.85rem', opacity: 0.6 }}>
        © 2025 Kommo Bot
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #5c33f6 0%, #000000 100%)',
      }}
    >
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          backgroundColor: '#3b27a3',
          boxShadow: '0 2px 8px rgba(0,0,0,0.7)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ letterSpacing: 1.2 }}>
            Kommo Bot
          </Typography>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
        aria-label="navegación principal"
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': {
              width: drawerWidth,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              borderRight: 'none',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          color: '#e0e0ff',
          background: 'linear-gradient(135deg, #5c33f6 0%, #000000 100%)',
          minHeight: '100vh',
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
}

export default Layout;
