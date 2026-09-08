import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './redux/store';
import { bindAuthHandlers } from './services/api';
import { updateSocketAuth } from './services/socket';
import { clearAuth, setCredentials } from './redux/slices/authSlice';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './assets/styles/main.css';
import App from './App.jsx';

bindAuthHandlers({
  onRefresh: ({ accessToken, user }) => {
    store.dispatch(setCredentials({ accessToken, user }));
    updateSocketAuth(accessToken);
  },
  onFailure: () => {
    store.dispatch(clearAuth());
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>
);
