import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  Snackbar,
  Fab,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  SnackbarContent
} from '@mui/material';
import {
  Send as SendIcon,
  Refresh as RefreshIcon,
  UploadFile as UploadFileIcon // <-- Nueva importación: Ícono para el botón de importar archivos
} from '@mui/icons-material';
import {
  fetchContacts,
  selectContact,
  clearSelectedContacts,
} from '../store/slices/contactsSlice';

function Contacts() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { items, status, error, selectedContactIds } = useSelector((state) => state.contacts);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  // <-- Nuevo estado: Para almacenar temporalmente el archivo que el usuario selecciona
  const [selectedFile, setSelectedFile] = useState(null);
  const [contactosTxt, setContactosTxt] = useState([]);
  const [mostrarContactosTxt, setMostrarContactosTxt] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const authStatus = params.get('auth');
    const authError = params.get('error');

    if (contactosTxt.length >= 1) {
      setMostrarContactosTxt(true)
    }
    if (authStatus === 'success') {
      setShowWelcomeDialog(true);
      window.history.replaceState({}, document.title, '/contacts');
      dispatch(fetchContacts());
    } else if (authError) {
      setSnackbarMessage('Error en la autenticación. Por favor, intenta de nuevo.');
      setSnackbarOpen(true);
      window.history.replaceState({}, document.title, '/contacts');
    }
  }, [location, dispatch, contactosTxt]);

  useEffect(() => {
  console.log('contactosTxt actualizado:', contactosTxt);
}, [contactosTxt]);

  const handleRefreshContacts = () => {
    dispatch(fetchContacts());
  };

  const handleSelectContact = (contactId) => {
    dispatch(selectContact(contactId));
  };

  const handleSyncSelected = () => {
    if (selectedContactIds.length > 0) {
      navigate('/sync');
    }
  };

  // <-- Nueva función: Se encarga de manejar la selección y lectura del archivo
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);

      const reader = new FileReader();

      reader.onload = (e) => {
        const fileContent = e.target.result;

        // Dividir el contenido por líneas, eliminar espacios y líneas vacías
        const lines = fileContent
          .split(/\r?\n/)
          .map(line => line.trim())
          .filter(line => line !== '');

        // Verificar si el archivo está vacío o sin datos válidos
        if (lines.length === 0) {
          alert(`El archivo está vacío o no contiene datos válidos.`);
          return;
        }

        // Verificar que cada línea sea un número válido
        const allValid = lines.every(line => /^[0-9]+$/.test(line));

        if (!allValid) {
          alert(`Error: El archivo debe contener solo números, uno por línea.`);
          return;
        }

        const numberArray = lines; // o lines.map(Number) si querés que sean enteros

        localStorage.setItem("numerosImportados", JSON.stringify(numberArray));

        const nuevosContactos = numberArray.map((numero, index) => ({
          id: `contact-${Date.now()}-${index}`,
          phone: numero,
          name: `Contacto ${index + 1}`,
        }));

        console.log(nuevosContactos)

        setContactosTxt(prev => [...prev, ...nuevosContactos]);

        console.log("Números importados:", numberArray);

        alert(`Archivo "${file.name}" importado correctamente. ${numberArray.length} números cargados.`);
      };

      reader.onerror = (e) => {
        console.error("Error al leer el archivo:", e.target.error);
        alert(`Error al leer el archivo: ${e.target.error.message}`);
      };

      reader.readAsText(file);
    }

    event.target.value = '';
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #5c33f6 0%, #000000 100%)',
        padding: 3,
        color: '#e0e0ff'
      }}
    >
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Contactos</Typography>
        <Box>
          {/* <-- Nuevo elemento: Input de tipo archivo oculto para la importación */}
          <input
            type="file"
            id="import-contacts-file-input" // ID único para referenciarlo desde el botón visible
            accept=".txt,.tex" // Filtra los tipos de archivo que se pueden seleccionar
            style={{ display: 'none' }} // Oculta el elemento input nativo
            onChange={handleFileChange} // Llama a la nueva función cuando se selecciona un archivo
          />
          {/* <-- Nuevo Botón: Visible para el usuario, que activa el input oculto */}
          <Button
            variant="contained"
            color="secondary"
            onClick={() => document.getElementById('import-contacts-file-input').click()} // Simula un clic en el input file oculto
            sx={{ mr: 2 }}
            startIcon={<UploadFileIcon />} // Usa el ícono de "subir archivo"
          >
            Importar Contactos
          </Button>

          <Button
            variant="contained"
            color="secondary"
            onClick={handleRefreshContacts}
            sx={{ mr: 2 }}
            startIcon={<RefreshIcon />}
          >
            Actualizar Contactos
          </Button>
          <Button
            variant="outlined"
            onClick={() => dispatch(clearSelectedContacts())}
            disabled={selectedContactIds.length === 0}
          >
            Limpiar Selección
          </Button>
        </Box>
      </Box>

      <Box mb={2}>
        <Typography variant="subtitle1" color="textSecondary">
          {selectedContactIds.length > 0
            ? `Contactos seleccionados (${selectedContactIds.length}/${items.length})`
            : `Ningún contacto seleccionado (0/${items.length})`}
        </Typography>
      </Box>

      {status === 'loading' && (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      )}

      {status === 'failed' && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={handleRefreshContacts}>
              Reintentar
            </Button>
          }
        >
          Error al cargar contactos: {error}
        </Alert>
      )}

      {status === 'succeeded' && items.length === 0 && (
        <Alert severity="info">
          No se encontraron contactos. Si acabas de autenticarte, haz clic en "Actualizar Contactos".
        </Alert>
      )}

      {mostrarContactosTxt && contactosTxt.length > 0 && (
        <Grid container spacing={3}>
          {contactosTxt.map((contact) => {
            const isSelected = selectedContactIds.includes(contact.id);
            return (
              <Grid item xs={12} sm={6} md={4} key={contact.id}>
                <Card
                  sx={{
                    backgroundColor: isSelected ? 'rgba(33, 150, 243, 0.08)' : 'rgba(0,0,0,0)',
                    border: isSelected ? '2px solid #2196F3' : '1px solid rgba(0, 0, 0, 0.12)',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleSelectContact(contact.id)}
                >
                  <CardContent>
                    <Box display="flex" alignItems="center">
                      <Checkbox
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectContact(contact.id);
                        }}
                        color="primary"
                      />
                      <Box flex={1}>
                        <Typography variant="h6">{contact.name}</Typography>
                        <Typography color="textSecondary">{contact.phoneNumber}</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {status === 'succeeded' && items.length > 0 && (
        <Grid container spacing={3}>
          {items.map((contact) => {
            const isSelected = selectedContactIds.includes(contact.id);
            return (
              <Grid item xs={12} sm={6} md={4} key={contact.id}>
                <Card
                  sx={{
                    backgroundColor: isSelected ? 'rgba(33, 150, 243, 0.08)' : 'rgba(0,0,0,0)',
                    border: isSelected ? '2px solid #2196F3' : '1px solid rgba(0, 0, 0, 0.12)',
                    transition: 'all 0.3s ease',
                    cursor: 'pointer'
                  }}
                  onClick={() => handleSelectContact(contact.id)}
                >
                  <CardContent>
                    <Box display="flex" alignItems="center">
                      <Checkbox
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          handleSelectContact(contact.id);
                        }}
                        color="primary"
                      />
                      <Box flex={1}>
                        <Typography variant="h6">{contact.name}</Typography>
                        <Typography color="textSecondary">{contact.phoneNumber}</Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      <Box sx={{ position: 'fixed', bottom: 16, right: 16 }}>
        <Tooltip title={selectedContactIds.length > 0 ? 'Sincronizar seleccionados' : 'Selecciona contactos para sincronizar'}>
          <span>
            <Fab
              color="secondary"
              onClick={handleSyncSelected}
              disabled={selectedContactIds.length === 0}
              sx={{
                opacity: selectedContactIds.length > 0 ? 1 : 0.6,
                transition: 'opacity 0.3s ease'
              }}
            >
              <SendIcon />
            </Fab>
          </span>
        </Tooltip>
      </Box>

      <Dialog
        open={showWelcomeDialog}
        onClose={() => setShowWelcomeDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>¡Autenticación Exitosa!</DialogTitle>
        <DialogContent>
          <Typography>
            Has sido autenticado correctamente con Google. Tus contactos se cargarán automáticamente.
            Si no ves tus contactos, haz clic en el botón "Actualizar Contactos".
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowWelcomeDialog(false)} color="primary">
            Entendido
          </Button>
          <Button
            onClick={() => {
              handleRefreshContacts();
              setShowWelcomeDialog(false);
            }}
            color="primary"
            variant="contained"
          >
            Actualizar Contactos
          </Button>
        </DialogActions>
      </Dialog>

      {/* <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
        ContentProps={{
          style: {
            backgroundColor: '#323232',
            color: '#fff'
          }
        }}
      /> */}
    </Box>
  );
}

export default Contacts;
