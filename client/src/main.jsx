import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import { normalizeAppPath } from './routes.js';

const currentPath = `${location.pathname}${location.search}${location.hash}`;
const normalizedPath = normalizeAppPath(currentPath);
if (normalizedPath !== currentPath) history.replaceState(null, '', normalizedPath);

createRoot(document.getElementById('root')).render(<App />);
