import api from '../config/api';

class AuthService {
    setToken(token) {
        if (token) {
            localStorage.setItem('kommoToken', token);
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            localStorage.removeItem('kommoToken');
            delete api.defaults.headers.common['Authorization'];
        }
    }

    getToken() {
        return localStorage.getItem('kommoToken');
    }

    isAuthenticated() {
        const token = this.getToken();
        return !!token;
    }

    logout() {
        this.setToken(null);
    }

    initializeAuth() {
        const token = this.getToken();
        if (token) {
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
    }
}

export default new AuthService(); 