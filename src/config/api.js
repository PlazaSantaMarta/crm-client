import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: 'https://crm-server-q3jg.onrender.com',  // Updated to use the full server URL
  timeout: 30000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

// Add a response interceptor to handle errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Si el error es de autenticación de Google
      if (error.response.data?.message?.includes('Google')) {
        console.error('Error de autenticación de Google:', error);
        // Limpiar el estado relacionado con Google si es necesario
        localStorage.removeItem('googleAuth');
      }
      // Si el error es de autenticación de Kommo
      else if (error.response.data?.message?.includes('Kommo')) {
        console.error('Error de autenticación de Kommo:', error);
        localStorage.removeItem('kommoToken');
      }
    }
    return Promise.reject(error);
  }
);

export default api; 

//