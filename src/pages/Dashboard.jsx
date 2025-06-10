// src/pages/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box, Card, CardContent, Typography, Button, Grid,
  Dialog, DialogContent, DialogTitle, DialogActions,
  Alert, Snackbar
} from '@mui/material';
import {
  LogoutOutlined as LogoutIcon, Google as GoogleIcon,
  SyncAlt as SyncIcon, ContactPhone as ContactsIcon,
  Link as LinkIcon
} from '@mui/icons-material';
import { fetchContacts } from '../store/slices/contactsSlice';
import api from '../config/api';
import { useTheme } from '@mui/material/styles';
import KommoModal from '../components/KommoModal';

function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();

  // Estados de la aplicación
  const { items: contacts, status } = useSelector((state) => state.contacts);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [authWindow, setAuthWindow] = useState(null);
  const [showKommoModal, setShowKommoModal] = useState(false);
  const [kommoStatus, setKommoStatus] = useState('disconnected');
  const [kommoConnected, setKommoConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Efecto para cargar información del usuario desde localStorage
  useEffect(() => {
    const userJson = localStorage.getItem('user');
    if (userJson) {
      try {
        const user = JSON.parse(userJson);
        setCurrentUser(user);
      } catch (e) {
        console.error('Error al parsear información del usuario:', e);
      }
    }
  }, []);
  
  // Efecto para verificar el estado de autenticación y manejar mensajes de Google Auth
  useEffect(() => {
    checkAuthStatus();
    checkKommoStatus();

    const handleAuthMessage = async (event) => {
      if (event.origin === window.location.origin && event.data === 'google-auth-success') {
        authWindow?.close();
        setAuthWindow(null);
        
        // Marcar que tenemos una sesión de Google activa
        localStorage.setItem('googleToken', 'active');
        
        await checkAuthStatus();
        setErrorMessage(null);
        setShowSuccessMessage(true);
      }
    };
    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, [authWindow]);

  // Función para verificar el estado de autenticación (Google)
  const checkAuthStatus = async () => {
    try {
      await dispatch(fetchContacts()).unwrap();
    } catch (error) {
      if (!error.message?.includes('No autenticado') && !error.message?.includes('Sesión expirada')) {
        setErrorMessage(error.message || 'Error al verificar autenticación');
      } else {
        setErrorMessage(null);
      }
    }
  };

  // Función de logout completa
  const logout = () => {
    // Limpiar todos los tokens y datos de usuario
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('kommoToken');
    localStorage.removeItem('user');
    
    // Limpiar headers de autenticación
    delete api.defaults.headers.common['Authorization'];
    
    // Resetear estados
    setKommoConnected(false);
    setCurrentUser(null);
    
    // Limpiar store de Redux
    dispatch({ type: 'contacts/clearAll' });
    dispatch({ type: 'messages/clearAll' });
    dispatch({ type: 'sync/clearAll' });
    
    // Mostrar mensaje y redirigir
    setErrorMessage(null);
    setShowSuccessMessage(true);
    setTimeout(() => { window.location.href = '/'; }, 1000);
  };

  // Verificar estado de Kommo
  const checkKommoStatus = async () => {
    try {
      const token = localStorage.getItem('token') || localStorage.getItem('kommoToken');
      if (!token) {
        setKommoStatus('disconnected');
        setKommoConnected(false);
        return;
      }

      // Verificar si hay un usuario activo
      const userJson = localStorage.getItem('user');
      if (userJson) {
        setKommoConnected(true);
      }
    } catch (error) {
      console.error('Error al verificar estado de Kommo:', error);
      setKommoStatus('disconnected');
      setKommoConnected(false);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('kommoToken');
      }
    }
  };

  // Función para cerrar sesión con confirmación
  const handleLogout = async () => {
    try {
      await api.post('/api/auth/logout');
      logout();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      setErrorMessage('Error al cerrar sesión. Por favor, intenta nuevamente.');
      setShowSuccessMessage(false);
      
      // Intentar logout local si falla el servidor
      logout();
    } finally {
      setShowLogoutConfirm(false);
    }
  };

  // Función para conectar con Google
  const handleConnectGoogle = async () => {
    try {
      const response = await api.get('/api/google');
      if (response.data?.authUrl) {
        // Abre la ventana de autenticación de Google
        const newWindow = window.open(response.data.authUrl, 'Google Auth', 'width=600,height=800,left=' + (window.screenX + (window.outerWidth - 600) / 2) + ',top=' + (window.screenY + (window.outerHeight - 800) / 2));
        setAuthWindow(newWindow);
        // Monitorear si la ventana se cierra
        const checkWindow = setInterval(() => {
          if (newWindow.closed) {
            clearInterval(checkWindow);
            setAuthWindow(null);
            // Si la ventana se cerró sin un mensaje de éxito, podría ser un error o cancelación
            checkAuthStatus(); // Volver a verificar el estado
          }
        }, 500);
      }
    } catch (error) {
      setErrorMessage('Error al conectar con Google. Por favor, intenta nuevamente.');
      setShowSuccessMessage(false);
    }
  };

  // Manejar login/registro con Kommo
  const handleKommoSubmit = async (authData) => {
    try {
      // Guardar tokens JWT
      localStorage.setItem('token', authData.token);
      localStorage.setItem('refreshToken', authData.refreshToken);
      localStorage.setItem('kommoToken', authData.token);
      
      // Guardar información del usuario
      localStorage.setItem('user', JSON.stringify({
        id: authData.user.id,
        username: authData.user.username
      }));
      
      setCurrentUser(authData.user);

      // Configurar el token en los headers
      api.defaults.headers.common['Authorization'] = `Bearer ${authData.token}`;

      await checkKommoStatus();

      setErrorMessage(null);
      setShowSuccessMessage(true);
      setShowKommoModal(false);
    } catch (error) {
      console.error('Error en la autenticación de Kommo:', error);
      setErrorMessage(error.response?.data?.message || 'Error al conectar con Kommo');
      setKommoStatus('disconnected');
      setKommoConnected(false);
    }
  };

  // Función específica para cerrar sesión de Kommo
  const handleKommoLogout = async () => {
    try {
      // Llamar al endpoint correcto para cerrar sesión en el servidor
      await api.post('/api/auth/logout');
      
      // Eliminar solo los tokens relacionados con Kommo
      localStorage.removeItem('kommoToken');
      
      // Si el token principal es de Kommo, eliminarlo también
      if (!localStorage.getItem('googleToken')) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        // Limpiar headers de autenticación
      delete api.defaults.headers.common['Authorization'];
      }
      
      // Actualizar estado
      setKommoConnected(false);
      setCurrentUser(null);
      
      // Mostrar mensaje de éxito
      setErrorMessage(null);
      setShowSuccessMessage(true);
      
      // Verificar estado actualizado
      await checkKommoStatus();
    } catch (error) {
      console.error('Error al cerrar sesión de Kommo:', error);
      
      // Si el error es 401 (Unauthorized), limpiar tokens de todas formas
      if (error.response?.status === 401) {
        localStorage.removeItem('kommoToken');
        
        if (!localStorage.getItem('googleToken')) {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          delete api.defaults.headers.common['Authorization'];
        }
        
        setKommoConnected(false);
        setCurrentUser(null);
        setShowSuccessMessage(true);
        await checkKommoStatus();
      } else {
        setErrorMessage('Error al cerrar sesión de Kommo. Por favor, intenta nuevamente.');
        setShowSuccessMessage(false);
      }
    }
  };

  // Función específica para cerrar sesión de Google
  const handleGoogleLogout = async () => {
    try {
      await api.post('/api/google/logout');
      
      // Limpiar solo los datos relacionados con Google
      localStorage.removeItem('googleToken');
      
      // Si no hay token de Kommo activo, limpiar token principal
      if (!localStorage.getItem('kommoToken')) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        // Limpiar headers de autenticación
        delete api.defaults.headers.common['Authorization'];
      }
      
      dispatch({ type: 'contacts/clearAll' });
      setErrorMessage(null);
      setShowSuccessMessage(true);
      checkAuthStatus();
    } catch (error) {
      console.error('Error al cerrar sesión de Google:', error);
      setErrorMessage('Error al cerrar sesión de Google. Por favor, intenta nuevamente.');
      setShowSuccessMessage(false);
    } finally {
      setShowLogoutConfirm(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* Encabezado del Dashboard y Botones de acción */}
        <Grid item xs={12}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h4">Dashboard</Typography>
            <Box>
              {/* Botón de Kommo */}
              <Button
                variant="outlined"
                startIcon={<LinkIcon />}
                onClick={kommoConnected ? handleKommoLogout : () => setShowKommoModal(true)}
                sx={{
                  mr: 2,
                  borderColor: kommoConnected ? theme.palette.error.main : theme.palette.info.main,
                  color: kommoConnected ? theme.palette.error.main : theme.palette.info.main,
                  '&:hover': {
                    borderColor: kommoConnected ? theme.palette.error.dark : theme.palette.info.dark,
                    color: kommoConnected ? theme.palette.error.dark : theme.palette.info.dark,
                    bgcolor: theme.palette.action.hover,
                  }
                }}
              >
                {kommoConnected ? 'Cerrar Sesión Kommo' : 'Conectar Kommo'}
              </Button>
              {/* Botón de Cerrar Sesión Google */}
              {status === 'succeeded' && (
                <Button
                  variant="outlined"
                  color="error"
                  startIcon={<GoogleIcon />}
                  onClick={() => setShowLogoutConfirm(true)}
                >
                  Cerrar Sesión Google
                </Button>
              )}
            </Box>
          </Box>
        </Grid>

        {/* Tarjetas principales */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flex: 1 }}>
              <Typography variant="h5" color="primary.light" gutterBottom>
                Contactos de Google
              </Typography>
              
              {status === 'loading' && (
                <Typography>Cargando contactos...</Typography>
              )}
              
              {status === 'failed' && (
                <Box>
                  <Typography color="error" gutterBottom>
                    No se pudieron cargar los contactos.
              </Typography>
              <Button
                variant="contained"
                    color="primary" 
                    onClick={handleConnectGoogle}
                    startIcon={<GoogleIcon />}
                    sx={{ mt: 2 }}
          >
                    Conectar con Google
                  </Button>
                </Box>
              )}
              
              {status === 'succeeded' && (
                <Box>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    {contacts.length} contactos disponibles
                  </Typography>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={() => navigate('/contacts')}
                    startIcon={<ContactsIcon />}
                    sx={{ mt: 2, mr: 2 }}
                  >
                    Ver Contactos
                  </Button>
                  <Button 
                    variant="outlined" 
                    color="secondary" 
                    onClick={() => navigate('/sync')}
                    startIcon={<SyncIcon />}
                    sx={{ mt: 2 }}
                  >
                    Sincronizar
                  </Button>
              </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h5" color="primary.light" gutterBottom>
                Estado de conexiones
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <GoogleIcon sx={{ color: status === 'succeeded' ? 'success.main' : 'error.main', mr: 1 }} />
                  <Typography>
                    Google Contacts: {status === 'succeeded' ? 'Conectado' : 'Desconectado'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <LinkIcon sx={{ color: kommoConnected ? 'success.main' : 'error.main', mr: 1 }} />
                  <Typography>
                    Kommo CRM: {kommoConnected ? 'Conectado' : 'Desconectado'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Modal de confirmación de cierre de sesión */}
      <Dialog open={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)}>
        <DialogTitle>Cerrar Sesión de Google</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Estás seguro de que deseas cerrar la sesión de Google? Esto eliminará tus contactos cargados.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLogoutConfirm(false)} color="primary">
            Cancelar
          </Button>
          <Button onClick={handleGoogleLogout} color="error" variant="contained">
            Cerrar Sesión
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Kommo */}
      <KommoModal 
        isOpen={showKommoModal} 
        onClose={() => setShowKommoModal(false)}
        onSubmit={handleKommoSubmit}
      />

      {/* Snackbar para mensajes de éxito */}
      <Snackbar
        open={showSuccessMessage}
        autoHideDuration={3000}
        onClose={() => setShowSuccessMessage(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setShowSuccessMessage(false)} severity="success">
          Operación completada con éxito
        </Alert>
      </Snackbar>

      {/* Snackbar para mensajes de error */}
      <Snackbar
        open={Boolean(errorMessage)}
        autoHideDuration={5000}
        onClose={() => setErrorMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setErrorMessage(null)} severity="error">
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Dashboard;