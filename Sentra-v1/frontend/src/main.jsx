import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Global styles — order matters
import './styles/theme.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/app.css';
import './styles/security.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);