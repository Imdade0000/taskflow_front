// environments/environments.ts - Configuration des URLs pour votre application
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api', // URL de base de votre API
  socketUrl: 'http://localhost:3000', // URL pour Socket.io
  
  // Configuration des endpoints spécifiques
  endpoints: {
    auth: '/auth',
    tasks: '/tasks',
    notifications: '/notifications',
    users: '/users',
    projects: '/projects'
  },
  
  // Configuration des notifications
  notifications: {
    // Rafraîchissement automatique des notifications (en millisecondes)
    refreshInterval: 30000, // 30 secondes
    
    // Timeout pour les requêtes de notification
    requestTimeout: 5000, // 5 secondes
    
    // Nombre maximum de notifications à afficher
    maxDisplayCount: 10,
    
    // Durée d'affichage des notifications navigateur
    browserNotificationDuration: 5000 // 5 secondes
  },
  
  // Configuration Socket.io
  socket: {
    timeout: 5000,
    transports: ['websocket', 'polling'],
    withCredentials: true,
    autoConnect: false // Connexion manuelle via le service
  }
};

// environments/environment.prod.ts - Configuration pour la production
export const environmentProd = {
  production: true,
  apiUrl: 'https://votre-domaine.com/api', // Remplacez par votre URL de production
  socketUrl: 'https://votre-domaine.com',
  
  endpoints: {
    auth: '/auth',
    tasks: '/tasks',
    notifications: '/notifications',
    users: '/users',
    projects: '/projects'
  },
  
  notifications: {
    refreshInterval: 60000, // 1 minute en production
    requestTimeout: 10000, // 10 secondes en production
    maxDisplayCount: 15,
    browserNotificationDuration: 7000
  },
  
  socket: {
    timeout: 10000,
    transports: ['websocket', 'polling'],
    withCredentials: true,
    autoConnect: false
  }
};