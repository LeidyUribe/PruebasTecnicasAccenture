
# 🚀 Proyecto Ionic + Angular — Prueba Técnic

Este documento describe la arquitectura, ejecución, configuración y funcionalidades implementadas en esta aplicación híbrida desarrollada con **Ionic 7 + Angular 17**, integrando **Firebase Remote Config**, CRUD de tareas y categorías, optimizaciones de rendimiento y estructura modular.

---

## 📌 1. Descripción General

Esta aplicación permite gestionar:

- ✔️ **Tareas** (CRUD completo)  
- ✔️ **Categorías** (CRUD completo)  
- ✔️ **Asignación y filtrado de tareas por categoría**  
- ✔️ **Feature Flags con Firebase Remote Config**  
  - Activación/desactivación dinámica del módulo de categorías  
- ✔️ **Optimización avanzada de rendimiento**  
  - Lazy loading  
  - Angular @if / @for  
  - trackBy  
  - Unsubscribe strategy  

Incluye además una estructura limpia, modular, documentada y lista para entregar en una prueba técnica.

---

## 📁 2. Estructura del Proyecto

```
src/
│── app/
│   ├── pages/
│   │   ├── tasks/         # CRUD de tareas
│   │   ├── categories/    # CRUD de categorías
│   ├── services/
│   │   ├── remote-config.service.ts
│   │   ├── tasks.service.ts
│   │   ├── categories.service.ts
│   ├── app.module.ts
│   ├── app-routing.module.ts
│
├── environments/
│   ├── environment.ts
│
└── theme/
    ├── variables.scss
```

---

## ⚙️ 3. Requerimientos Previos

Instalar globalmente:

```bash
npm install -g @ionic/cli
```

Dependencias internas:

```bash
npm install
```

---

## 🔥 4. Configurar Firebase

1. Crear un proyecto en Firebase  
2. Añadir una Web App  
3. Copiar las credenciales en:

```
src/environments/environment.ts
```

Ejemplo:

```ts
export const environment = {
  production: false,
  firebaseConfig: {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
  }
};
```

### Crear un Feature Flag en Remote Config

En Firebase Console:

**Build → Remote Config → Add parameter**

```
enableCategories : true/false
```

Publicar cambios.

---

## 🧪 5. Ejecutar la Aplicación

### Modo desarrollo

```bash
ionic serve/ ng serve
```

### Si usas Remote Config y hay errores del navegador (extensiones)

```bash
ionic serve --no-open
```

## 📱 6. Ejecutar en Android / iOS (Capacitor)

### Android

```bash
ionic build
ionic cap add android
ionic cap copy
ionic cap open android
```

### iOS

```bash
ionic build
ionic cap add ios
ionic cap copy
ionic cap open ios
```

---

## ⚡ 7. Optimizaciones de Rendimiento Implementadas

### ✔ Lazy Loading por módulo
Cada tab y página carga solo cuando se necesita.

### ✔ Nueva sintaxis Angular 17 (`@if`, `@for`)
Menos overhead y mejor legibilidad.

### ✔ trackBy para evitar recreación de items

```ts
trackByTask(index: number, item: Task) {
  return item.id;
}
```

### ✔ Observables + BehaviorSubject para listas
Reactividad eficiente sin repintar toda la UI.

### ✔ Unsubscribe en OnDestroy
Evita memory leaks al navegar entre tabs.

---

## 🧩 8. Cambios Realizados (Resumen técnico)

- Migración completa a Angular 17  
- Limpieza total del SDK Firebase compat  
- Implementación modular:
  - `provideFirebaseApp`
  - `provideRemoteConfig`
- Creación de RemoteConfigService reactivo  
- Implementación del feature flag `enableCategories`  
- Conversión de directivas antiguas a sintaxis moderna Angular  
- Separación de tareas/categorías en tabs  
- CRUD completo con persistencia en Ionic Storage  
- Compatibilidad total con Capacitor  
- Aplicación optimizada para producción  

---

## 📝 9. Scripts del Proyecto

### Compilar:

```bash
ionic build
```

### Compilar producción:

```bash
ionic build --prod
```

### Sincronizar plataformas:

```bash
ionic cap sync
```

---

## 👨‍💻 10. Autor

Proyecto desarrollado como parte de una prueba técnica, siguiendo buenas prácticas de arquitectura, optimización y modularidad.

---

## 📄 11. Licencia

Uso libre para fines educativos o pruebas técnicas.

---

¡Lista para entregar profesionalmente! 🚀

