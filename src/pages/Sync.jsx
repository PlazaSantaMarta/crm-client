import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  Paper,
  Grid,
  LinearProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@mui/material';
import {
  Sync as SyncIcon,
  Google as GoogleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  AccountTree as AccountTreeIcon
} from '@mui/icons-material';
import { syncContactsWithKommo } from '../store/slices/syncSlice';
import { checkAuthStatus } from '../store/slices/authSlice';
import api from '../config/api';
import { useTheme } from '@mui/material/styles';

// Usar el mismo token para todas las peticiones
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
};

function Sync() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();
  const { status, error } = useSelector((state) => state.sync);
  const { items: googleContacts, selectedContactIds } = useSelector((state) => state.contacts);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [allContacts, setAllContacts] = useState([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResults, setSyncResults] = useState({ contacts: [], processed: 0, total: 0 });
  const [syncError, setSyncError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [currentCount, setCurrentCount] = useState(0);
  const [syncComplete, setSyncComplete] = useState(false);
  const [processedPairs, setProcessedPairs] = useState([]);
  const [pipelines, setPipelines] = useState([]);
  const [selectedPipeline, setSelectedPipeline] = useState('');
  const [loadingPipelines, setLoadingPipelines] = useState(false);
  const [statuses, setStatuses] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [loadingStatuses, setLoadingStatuses] = useState(false);
  const [showKommoModal, setShowKommoModal] = useState(false);

  // Verificar autenticación al cargar el componente
  useEffect(() => {
    // Verificar si hay algún token de autenticación
    const token = localStorage.getItem('token');
    const kommoToken = localStorage.getItem('kommoToken');
    const googleToken = localStorage.getItem('googleToken');
    
    if (!token && !kommoToken && !googleToken) {
      navigate('/', { replace: true });
      return;
    }
    
    dispatch(checkAuthStatus());
  }, [dispatch, navigate]);

  // Redirigir si no está autenticado (por seguridad adicional)
  useEffect(() => {
    const hasAnyToken = localStorage.getItem('token') || 
                        localStorage.getItem('kommoToken') || 
                        localStorage.getItem('googleToken');
                        
    if (isAuthenticated === false && !hasAnyToken) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Obtener contactos importados del localStorage
    const importedContacts = JSON.parse(localStorage.getItem('importedContacts') || '[]');
    // Combinar contactos de Google con los importados
    setAllContacts([...googleContacts, ...importedContacts]);
  }, [googleContacts]);

  const contactsToSync = selectedContactIds.length > 0
    ? allContacts.filter(contact => selectedContactIds.includes(contact.id))
    : allContacts;

  const handleGetPipelines = async () => {
    try {
      setLoadingPipelines(true);
      setSyncError(null);

      // Usar api de axios en lugar de fetch para aprovechar los interceptores
      const response = await api.get('/api/kommo/pipelines');
      
      if (response.data.success && response.data.pipelines) {
        setPipelines(response.data.pipelines);
      } else {
        throw new Error(response.data.message || 'Error al obtener los pipelines');
      }
    } catch (error) {
      console.error('Error:', error);
      setSyncError(error.response?.data?.error || error.message);
      if (error.response?.status === 401) {
        setShowKommoModal(true);
      }
    } finally {
      setLoadingPipelines(false);
    }
  };

  const handleSync = async () => {
    if (!selectedPipeline) {
      setSyncError('Por favor, selecciona un pipeline antes de sincronizar');
      return;
    }

    try {
      setIsSyncing(true);
      setSyncError(null);
      setProgress(0);
      setCurrentCount(0);
      setSyncComplete(false);
      setProcessedPairs([]);

      // Preparar los contactos para sincronizar
      const contactsToProcess = contactsToSync.map(contact => ({
        id: contact.id,
        name: contact.name,
        phoneNumber: contact.phone || contact.phoneNumber, // Manejar ambos formatos
        email: contact.email || '',
        source: contact.phone ? 'imported' : 'google' // Identificar la fuente del contacto
      }));

      // Usar api de axios en lugar de fetch
      const response = await api.post('/api/kommo/generate-leads', {
        pipeline_id: selectedPipeline,
        status_id: selectedStatus || null,
        contacts: contactsToProcess,
        contact_ids: selectedContactIds.length > 0 ? selectedContactIds : null
      });

      const data = response.data;

      if (data.success && data.results) {
        const { contacts: syncedContacts, processed, total } = data.results;

        const successfulContacts = syncedContacts.filter(contact => contact.success);
        const failedContacts = syncedContacts.filter(contact => !contact.success);

        setProcessedPairs(syncedContacts);
        setCurrentCount(processed);
        setProgress((processed / total) * 100);
        setSyncComplete(true);
        setSyncResults({
          contacts: syncedContacts,
          processed,
          total,
          successful: successfulContacts.length,
          failed: failedContacts.length
        });
      } else {
        throw new Error(data.message || 'Error en la sincronización');
      }

    } catch (error) {
      console.error('Error:', error);
      setSyncError(error.response?.data?.error || error.message);
      if (error.response?.status === 401) {
        setShowKommoModal(true);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConnectGoogle = async () => {
    setIsConnecting(true);
    try {
      const response = await api.get('/api/google');
      if (response.data && response.data.authUrl) {
        window.open(response.data.authUrl, '_blank', 'width=600,height=800');
      }
    } catch (error) {
      console.error('Error al obtener URL de autenticación:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const isGoogleAuthError = error?.includes('No access') || error?.includes('refresh token');

  const handleGetStatuses = async (pipelineId) => {
    try {
      setLoadingStatuses(true);
      setSyncError(null);

      // Usar api de axios en lugar de fetch
      const response = await api.get(`/api/kommo/pipelines/${pipelineId}/statuses`);
      
      const data = response.data;
      if (data.success && data.statuses) {
        setStatuses(data.statuses);
      } else {
        throw new Error(data.message || 'Error al obtener los estados del pipeline');
      }
    } catch (error) {
      console.error('Error:', error);
      setSyncError(error.response?.data?.error || error.message);
      if (error.response?.status === 401) {
        setShowKommoModal(true);
      }
    } finally {
      setLoadingStatuses(false);
    }
  };

  const handlePipelineChange = (event) => {
    const newPipelineId = event.target.value;
    setSelectedPipeline(newPipelineId);
    setSelectedStatus(''); // Resetear el estado seleccionado
    setStatuses([]); // Limpiar los estados anteriores
    if (newPipelineId) {
      handleGetStatuses(newPipelineId);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        Sincronización con Kommo
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Configuración de Pipeline
              </Typography>
              
              <Box sx={{ mb: 3 }}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body1" gutterBottom>
                    Contactos a sincronizar: {contactsToSync.length}
                  </Typography>
                  {selectedContactIds.length > 0 ? (
                    <Typography variant="body2" color="textSecondary">
                      (Contactos seleccionados: {selectedContactIds.length})
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      (Se sincronizarán todos los contactos: {allContacts.length})
                    </Typography>
                  )}
                </Box>

                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={loadingPipelines ? <CircularProgress size={24} /> : <AccountTreeIcon />}
                  onClick={handleGetPipelines}
                  disabled={loadingPipelines}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  {loadingPipelines ? 'Cargando Pipelines...' : 'Obtener Pipelines Disponibles'}
                </Button>

                {pipelines.length > 0 && (
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Seleccionar Pipeline</InputLabel>
                    <Select
                      value={selectedPipeline}
                      onChange={handlePipelineChange}
                      label="Seleccionar Pipeline"
                    >
                      {pipelines.map((pipeline) => (
                        <MenuItem key={pipeline.id} value={pipeline.id}>
                          {pipeline.name} (ID: {pipeline.id})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}

                {selectedPipeline && statuses.length > 0 && (
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Seleccionar Estado</InputLabel>
                    <Select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      label="Seleccionar Estado"
                      disabled={loadingStatuses}
                    >
                      {statuses.map((status) => (
                        <MenuItem key={status.id} value={status.id}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{
                                width: 16,
                                height: 16,
                                borderRadius: '50%',
                                backgroundColor: status.color,
                                border: '1px solid rgba(0, 0, 0, 0.1)'
                              }}
                            />
                            {status.name}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                    {loadingStatuses && (
                      <Box sx={{ mt: 1 }}>
                        <LinearProgress />
                      </Box>
                    )}
                  </FormControl>
                )}

                {isSyncing && (
                  <Box sx={{ width: '100%', mt: 2 }}>
                    <Typography 
                      variant="body2" 
                      color="textSecondary" 
                      gutterBottom
                    >
                      Sincronizando contactos...
                    </Typography>
                    <LinearProgress 
                      variant="indeterminate"
                      sx={{ 
                        height: 10, 
                        borderRadius: 5,
                        mb: 1,
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 5,
                        }
                      }}
                    />
                  </Box>
                )}
              </Box>

              {isGoogleAuthError ? (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={isConnecting ? <CircularProgress size={24} color="inherit" /> : <GoogleIcon />}
                  onClick={handleConnectGoogle}
                  disabled={isConnecting}
                  fullWidth
                  sx={{ py: 1.5 }}
                >
                  {isConnecting ? 'Conectando...' : 'Conectar con Google'}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={isSyncing ? <CircularProgress size={24} color="inherit" /> : <SyncIcon />}
                  onClick={handleSync}
                  disabled={isSyncing || contactsToSync.length === 0 || !selectedPipeline}
                  fullWidth
                  sx={{ py: 1.5 }}
                >
                  {isSyncing ? 'Sincronizando...' : `Sincronizar ${selectedContactIds.length > 0 ? `${selectedContactIds.length} contactos` : 'Todos'}`}
                </Button>
              )}
            </CardContent>
          </Card>

          {syncError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {syncError}
            </Alert>
          )}

          {syncComplete && !syncError && (
            <Card sx={{ mb: 2, color: 'text.primary' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CheckCircleIcon color="success" sx={{ mr: 1, fontSize: 28 }} />
                  <Typography variant="h6" color="text.primary">
                    ¡Sincronización Completada!
                  </Typography>
                </Box>

                <Box sx={{ pl: 4 }}>
                  <Typography variant="body1" gutterBottom>
                    Se procesaron <strong>{syncResults.processed}</strong> de <strong>{syncResults.total}</strong> contactos
                  </Typography>
                  
                  <Box sx={{ my: 1 }}>
                    <Typography variant="body1" color="success.main" gutterBottom>
                      ✓ Contactos exitosos: <strong>{syncResults.successful}</strong>
                    </Typography>
                    {syncResults.failed > 0 && (
                      <Typography variant="body1" color="error.main" gutterBottom>
                        ✗ Contactos con errores: <strong>{syncResults.failed}</strong>
                      </Typography>
                    )}
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Pipeline seleccionado: {pipelines.find(p => p.id === selectedPipeline)?.name}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          )}

          {processedPairs.length > 0 && (
            <Paper sx={{ p: 2, maxHeight: 400, overflow: 'auto', color: 'text.primary' }}>
              <Typography variant="h6" gutterBottom>
                Detalle de Contactos y Leads Generados
              </Typography>
              
              <List dense>
                {processedPairs.map((pair, index) => (
                  <React.Fragment key={index}>
                    <ListItem>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {pair.success ? (
                              <CheckCircleIcon color="success" sx={{ mr: 1, fontSize: 'small' }} />
                            ) : (
                              <ErrorIcon color="error" sx={{ mr: 1, fontSize: 'small' }} />
                            )}
                            <Typography variant="subtitle2" color="text.primary">
                              {pair.name}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          pair.success ? (
                            <Box sx={{ pl: 3 }}>
                              <Typography variant="body2" color="text.secondary">
                                • ID Contacto: {pair.contactId}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                • ID Lead: {pair.leadId}
                              </Typography>
                            </Box>
                          ) : (
                            <Typography variant="body2" color="error" sx={{ pl: 3 }}>
                              Error: {pair.error}
                            </Typography>
                          )
                        }
                      />
                    </ListItem>
                    {index < processedPairs.length - 1 && <Divider sx={{ borderColor: theme.palette.divider }} />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
}

export default Sync;