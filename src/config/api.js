import axios from 'axios';

// Create axios instance with default config
const api = axios.create({
  baseURL: '',  // Usar URL relativa para que funcione con el proxy de Vite
  timeout: 30000,
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

// Configurar token si existe al iniciar la aplicación
const token = localStorage.getItem('token');
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Agregar interceptor de peticiones para incluir el token JWT
api.interceptors.request.use(
  config => {
    // Obtener token JWT del localStorage en cada petición
    // Esto asegura que siempre usemos el token más reciente
    const token = localStorage.getItem('token');
    
    // Si hay token, añadirlo al header Authorization
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  error => {
    return Promise.reject(error);
  }
);

// Interceptor de respuestas para manejar errores y refresh token
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    // Si es error 401 (Unauthorized) y no es un intento de refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Marcar para evitar loop infinito
      originalRequest._retry = true;
      
      // Intentar refresh token si existe
      const refreshToken = localStorage.getItem('refreshToken');
      
      if (refreshToken) {
        try {
          // Llamar al endpoint de refresh token
          const response = await axios.post('/api/auth/refresh-token', {
            refreshToken
          });
          
          // Si se obtiene un nuevo token, guardarlo y reintentar la petición
          if (response.data.token) {
            localStorage.setItem('token', response.data.token);
            api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          console.error('Error al renovar token:', refreshError);
          
          // Si falla el refresh, limpiar tokens y redirigir al login
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          
          // Redirigir al login
          window.location.href = '/';
          return Promise.reject(refreshError);
        }
      }
    }
    
    // Mensaje de error para usuario
    if (error.response?.status === 401) {
      console.error('Error de autenticación:', error);
    }
    
    return Promise.reject(error);
  }
);

export default api; 

//