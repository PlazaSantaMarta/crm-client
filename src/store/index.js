import { configureStore } from '@reduxjs/toolkit';
import contactsReducer from './slices/contactsSlice';
import syncReducer from './slices/syncSlice';
import authReducer from './slices/authSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    contacts: contactsReducer,
    sync: syncReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store; 