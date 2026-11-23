# ADR-001: Stack y arquitectura del monorepo

- Estado: aceptado
- Fecha: 2026-10-30

## Contexto

La especificacion exige una API REST, una app movil Android y una version web,
con contratos y reglas de negocio compartidas. El equipo necesita un unico
repositorio que permita iterar rapido sin duplicar validaciones ni tipos.

## Decision

Se usa un monorepo con npm workspaces:

- `apps/api`: Node.js 20, TypeScript, Express, Mongoose y Zod.
- `apps/client`: React Native con Expo SDK 52, React Navigation 7 y React
  Native Web para la version navegador.
- `packages/shared`: constantes, enums, DTOs y contratos TypeScript consumidos
  por API y cliente.

La API sigue capas `routes -> controllers -> services -> models`. Los servicios
concentran reglas de negocio y los controladores solo traducen HTTP. La
validacion de entrada usa Zod y la salida se mapea explicitamente para no
exponer campos internos de Mongoose.

## Consecuencias

- Un solo `npm install` en la raiz instala y enlaza los tres paquetes.
- `packages/shared` se compila a `dist` en `postinstall`; la API lo consume como
  paquete CommonJS.
- El cliente usa un entrypoint propio (`index.js`) porque Expo esta hoisted en
  la raiz del workspace y `expo/AppEntry.js` no resuelve `App` correctamente.
- El tipado compartido reduce divergencias, pero cualquier cambio de contrato
  requiere recompilar shared y volver a typechequear ambos consumidores.
