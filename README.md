# Platanus Hack: the Curve

Display interactivo para hackathones.

## Funcionalidades

- [x] Countdown
- [x] Siguientes actividades
- [x] Feed de eventos push de GitHub
- [x] Anuncios
- [x] Música actual
  - [x] Via API
- [ ] Tarjetas para destacar equipos
- [x] Pantalla interactiva
  - [x] ????
  - [x] Embed IFrame

## Stack

- React
- TailwindCSS v4 (versiones alpha) + CVA (versión beta)
- Convex como Backend
- GitHub OAuth + AuthJS via Convex como Auth
- TanksTack Router (+ friends) en Vite

## Setup

```
pnpx convex dev
```

### Variables de entorno de Convex

```sh
# URL del frontend
SITE_URL=

# Versión actual de la APP.
# Refrescará los navegadores de los usuarios conectados.
VERSION=

# Configuración de OAuth de GitHub
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Auth de Convex, generados con
node scripts/generateKeys.mjs
JWT_PRIVATE_KEY=
JWKS=
```
