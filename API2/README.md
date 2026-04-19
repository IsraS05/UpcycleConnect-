# UpcycleConnect API

API Go pour le back-office admin UpcycleConnect.

## Lancer l'API

```bash
go mod tidy
go run admin.go
```

Serveur sur : http://localhost:8081

## Routes disponibles

### Utilisateurs
- GET    /admin/users
- POST   /admin/users/add
- PUT    /admin/users/modify/{id}
- DELETE /admin/users/delete/{id}
- GET    /admin/users/role/{role}
- GET    /admin/users/search?name=&role=

### Categories
- GET    /admin/categories
- POST   /admin/categories/add
- DELETE /admin/categories/delete/{id}

### Annonces
- GET    /admin/annonces
- PUT    /admin/annonces/validate/{id}
- PUT    /admin/annonces/refuse/{id}

### Evenements
- GET    /admin/evenements
- POST   /admin/evenements/add
- PUT    /admin/evenements/validate/{id}
- PUT    /admin/evenements/refuse/{id}

### Conteneurs
- GET    /admin/conteneurs
- POST   /admin/conteneurs/add
- PUT    /admin/conteneurs/modify/{id}

### Depots
- GET    /admin/depots
- PUT    /admin/depots/validate/{id}

### Commandes et Abonnements
- GET    /admin/commandes
- GET    /admin/abonnements
