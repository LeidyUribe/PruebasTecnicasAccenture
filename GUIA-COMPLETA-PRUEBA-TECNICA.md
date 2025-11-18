# 🚀 Guía Completa: Prueba Técnica Ionic 7 + Angular 17

## 📋 ÍNDICE

1. [Aplicación Base](#1-aplicación-base)
2. [To-Do List Básica](#2-to-do-list-básica)
3. [Sistema de Categorías](#3-sistema-de-categorías)
4. [Firebase + Remote Config](#4-firebase--remote-config)
5. [Optimizaciones](#5-optimizaciones)
6. [Entrega Final](#6-entrega-final)

---

## 1. APLICACIÓN BASE

### 1.1 Instalación y Creación del Proyecto

```bash
# Verificar versiones (requerido)
node --version    # >= 18.x
npm --version     # >= 9.x

# Instalar Ionic CLI globalmente
npm install -g @ionic/cli@latest

# Crear proyecto Ionic 7 con Angular 17
ionic start todo-app tabs --type=angular --capacitor=false

# Navegar al proyecto
cd todo-app

# Verificar versión de Ionic
ionic --version   # Debe ser 7.x
```

### 1.2 Instalar Dependencias Necesarias

```bash
# Storage para persistencia local
npm install @ionic/storage-angular@latest

# Firebase para Remote Config
npm install firebase@latest @angular/fire@latest

# Cordova para compilación nativa
npm install cordova@latest
npm install -g cordova@latest
```

### 1.3 Configurar Cordova

```bash
# Agregar plataforma Android
ionic cordova platform add android@latest

# Agregar plataforma iOS (solo macOS)
ionic cordova platform add ios@latest

# Verificar plataformas instaladas
ionic cordova platform list
```

### 1.4 Estructura del Proyecto

```
todo-app/
├── src/
│   ├── app/
│   │   ├── home/
│   │   │   ├── home.page.ts
│   │   │   ├── home.page.html
│   │   │   ├── home.page.scss
│   │   │   └── home.module.ts
│   │   ├── categories/
│   │   │   ├── categories.page.ts
│   │   │   ├── categories.page.html
│   │   │   ├── categories.page.scss
│   │   │   └── categories.module.ts
│   │   ├── services/
│   │   │   ├── todo.service.ts
│   │   │   ├── category.service.ts
│   │   │   └── remote-config.service.ts
│   │   ├── models/
│   │   │   ├── todo.model.ts
│   │   │   └── category.model.ts
│   │   ├── app.component.ts
│   │   ├── app.module.ts
│   │   └── app-routing.module.ts
│   └── environments/
│       ├── environment.ts
│       └── environment.prod.ts
├── config.xml
├── package.json
└── README.md
```

---

## 2. TO-DO LIST BÁSICA

### 2.1 Crear Modelo de Tarea

**Archivo: `src/app/models/todo.model.ts`**

```typescript
export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  categoryId?: string;
  createdAt: number;
  updatedAt: number;
}
```

### 2.2 Configurar Ionic Storage (SIN ERRORES JIT)

**Archivo: `src/app/app.module.ts`**

```typescript
import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { IonicStorageModule } from '@ionic/storage-angular';
import * as CordovaSQLiteDriver from 'localforage-cordovasqlitedriver';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';

// Firebase
import { AngularFireModule } from '@angular/fire/compat';
import { AngularFireRemoteConfigModule } from '@angular/fire/compat/remote-config';
import { environment } from '../environments/environment';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    FormsModule,
    ReactiveFormsModule,
    IonicModule.forRoot({
      mode: 'md'
    }),
    AppRoutingModule,
    // Configuración CORRECTA de IonicStorageModule (evita JIT errors)
    IonicStorageModule.forRoot({
      name: '__todoappdb',
      driverOrder: [
        CordovaSQLiteDriver._driver,
        'indexeddb',
        'websql',
        'localstorage'
      ]
    }),
    AngularFireModule.initializeApp(environment.firebase),
    AngularFireRemoteConfigModule
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy }
  ],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule {}
```

**Instalar driver adicional:**
```bash
npm install localforage-cordovasqlitedriver
```

### 2.3 Crear Servicio de Tareas

**Archivo: `src/app/services/todo.service.ts`**

```typescript
import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { Todo } from '../models/todo.model';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TodoService {
  private todosSubject = new BehaviorSubject<Todo[]>([]);
  public todos$: Observable<Todo[]> = this.todosSubject.asObservable();
  private readonly storageKey = 'todos';
  private storageInitialized = false;

  constructor(private storage: Storage) {
    this.init();
  }

  private async init(): Promise<void> {
    try {
      await this.storage.create();
      this.storageInitialized = true;
      await this.loadTodos();
    } catch (error) {
      console.error('Error initializing storage:', error);
    }
  }

  private async loadTodos(): Promise<void> {
    if (!this.storageInitialized) {
      await this.init();
    }
    try {
      const todos = await this.storage.get(this.storageKey) || [];
      this.todosSubject.next(todos);
    } catch (error) {
      console.error('Error loading todos:', error);
      this.todosSubject.next([]);
    }
  }

  async createTodo(title: string, description?: string, categoryId?: string): Promise<Todo> {
    if (!this.storageInitialized) {
      await this.init();
    }

    const newTodo: Todo = {
      id: this.generateId(),
      title: title.trim(),
      description: description?.trim(),
      completed: false,
      categoryId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const todos = this.todosSubject.value;
    todos.push(newTodo);
    
    try {
      await this.storage.set(this.storageKey, todos);
      this.todosSubject.next([...todos]);
      return newTodo;
    } catch (error) {
      console.error('Error creating todo:', error);
      throw error;
    }
  }

  async updateTodo(id: string, updates: Partial<Todo>): Promise<void> {
    if (!this.storageInitialized) {
      await this.init();
    }

    const todos = this.todosSubject.value;
    const index = todos.findIndex(t => t.id === id);
    
    if (index === -1) {
      throw new Error(`Todo with id ${id} not found`);
    }

    todos[index] = {
      ...todos[index],
      ...updates,
      updatedAt: Date.now()
    };

    try {
      await this.storage.set(this.storageKey, todos);
      this.todosSubject.next([...todos]);
    } catch (error) {
      console.error('Error updating todo:', error);
      throw error;
    }
  }

  async toggleComplete(id: string): Promise<void> {
    const todo = this.todosSubject.value.find(t => t.id === id);
    if (todo) {
      await this.updateTodo(id, { completed: !todo.completed });
    }
  }

  async deleteTodo(id: string): Promise<void> {
    if (!this.storageInitialized) {
      await this.init();
    }

    const todos = this.todosSubject.value.filter(t => t.id !== id);
    
    try {
      await this.storage.set(this.storageKey, todos);
      this.todosSubject.next([...todos]);
    } catch (error) {
      console.error('Error deleting todo:', error);
      throw error;
    }
  }

  getTodoById(id: string): Todo | undefined {
    return this.todosSubject.value.find(t => t.id === id);
  }

  getAllTodos(): Todo[] {
    return this.todosSubject.value;
  }

  getTodosByCategory(categoryId: string): Observable<Todo[]> {
    return this.todos$.pipe(
      map(todos => todos.filter(t => t.categoryId === categoryId))
    );
  }

  getCompletedTodos(): Observable<Todo[]> {
    return this.todos$.pipe(
      map(todos => todos.filter(t => t.completed))
    );
  }

  getPendingTodos(): Observable<Todo[]> {
    return this.todos$.pipe(
      map(todos => todos.filter(t => !t.completed))
    );
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### 2.3.1 Versión Mejorada con Fallback a localStorage

**Versión mejorada del servicio con fallback automático a localStorage si falla la base de datos:**

**Archivo: `src/app/services/todo.service.ts` (Versión con Fallback)**

```typescript
import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { Todo } from '../models/todo.model';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TodoService {
  private todosSubject = new BehaviorSubject<Todo[]>([]);
  public todos$: Observable<Todo[]> = this.todosSubject.asObservable();
  private readonly storageKey = 'todos';
  private storageInitialized = false;
  private useLocalStorage = false; // Flag para saber qué almacenamiento usar

  constructor(private storage: Storage) {
    this.init();
  }

  private async init(): Promise<void> {
    try {
      await this.storage.create();
      this.storageInitialized = true;
      this.useLocalStorage = false;
      await this.loadTodos();
    } catch (error) {
      console.warn('Ionic Storage falló, usando localStorage como fallback:', error);
      this.useLocalStorage = true;
      this.storageInitialized = true; // Marcar como inicializado para usar localStorage
      await this.loadTodos();
    }
  }

  private async loadTodos(): Promise<void> {
    if (!this.storageInitialized) {
      await this.init();
    }
    
    try {
      let todos: Todo[] = [];
      
      if (this.useLocalStorage) {
        // Usar localStorage como fallback
        const stored = localStorage.getItem(this.storageKey);
        todos = stored ? JSON.parse(stored) : [];
      } else {
        // Intentar usar Ionic Storage
        try {
          todos = await this.storage.get(this.storageKey) || [];
        } catch (error) {
          console.warn('Error al leer de Ionic Storage, cambiando a localStorage:', error);
          this.useLocalStorage = true;
          const stored = localStorage.getItem(this.storageKey);
          todos = stored ? JSON.parse(stored) : [];
        }
      }
      
      this.todosSubject.next(todos);
    } catch (error) {
      console.error('Error loading todos:', error);
      this.todosSubject.next([]);
    }
  }

  private async saveTodos(todos: Todo[]): Promise<void> {
    try {
      if (this.useLocalStorage) {
        // Guardar en localStorage
        localStorage.setItem(this.storageKey, JSON.stringify(todos));
      } else {
        // Intentar guardar en Ionic Storage
        try {
          await this.storage.set(this.storageKey, todos);
          // También guardar en localStorage como backup
          localStorage.setItem(this.storageKey, JSON.stringify(todos));
        } catch (error) {
          console.warn('Error al guardar en Ionic Storage, usando localStorage:', error);
          this.useLocalStorage = true;
          localStorage.setItem(this.storageKey, JSON.stringify(todos));
        }
      }
    } catch (error) {
      console.error('Error saving todos:', error);
      throw error;
    }
  }

  async createTodo(title: string, description?: string, categoryId?: string): Promise<Todo> {
    if (!this.storageInitialized) {
      await this.init();
    }

    const newTodo: Todo = {
      id: this.generateId(),
      title: title.trim(),
      description: description?.trim(),
      completed: false,
      categoryId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const todos = this.todosSubject.value;
    todos.push(newTodo);
    
    try {
      await this.saveTodos(todos);
      this.todosSubject.next([...todos]);
      return newTodo;
    } catch (error) {
      console.error('Error creating todo:', error);
      throw error;
    }
  }

  async updateTodo(id: string, updates: Partial<Todo>): Promise<void> {
    if (!this.storageInitialized) {
      await this.init();
    }

    const todos = this.todosSubject.value;
    const index = todos.findIndex(t => t.id === id);
    
    if (index === -1) {
      throw new Error(`Todo with id ${id} not found`);
    }

    todos[index] = {
      ...todos[index],
      ...updates,
      updatedAt: Date.now()
    };

    try {
      await this.saveTodos(todos);
      this.todosSubject.next([...todos]);
    } catch (error) {
      console.error('Error updating todo:', error);
      throw error;
    }
  }

  async toggleComplete(id: string): Promise<void> {
    const todo = this.todosSubject.value.find(t => t.id === id);
    if (todo) {
      await this.updateTodo(id, { completed: !todo.completed });
    }
  }

  async deleteTodo(id: string): Promise<void> {
    if (!this.storageInitialized) {
      await this.init();
    }

    const todos = this.todosSubject.value.filter(t => t.id !== id);
    
    try {
      await this.saveTodos(todos);
      this.todosSubject.next([...todos]);
    } catch (error) {
      console.error('Error deleting todo:', error);
      throw error;
    }
  }

  getTodoById(id: string): Todo | undefined {
    return this.todosSubject.value.find(t => t.id === id);
  }

  getAllTodos(): Todo[] {
    return this.todosSubject.value;
  }

  getTodosByCategory(categoryId: string): Observable<Todo[]> {
    return this.todos$.pipe(
      map(todos => todos.filter(t => t.categoryId === categoryId))
    );
  }

  getCompletedTodos(): Observable<Todo[]> {
    return this.todos$.pipe(
      map(todos => todos.filter(t => t.completed))
    );
  }

  getPendingTodos(): Observable<Todo[]> {
    return this.todos$.pipe(
      map(todos => todos.filter(t => !t.completed))
    );
  }

  // Método para verificar qué almacenamiento se está usando
  getStorageType(): 'ionic-storage' | 'localstorage' {
    return this.useLocalStorage ? 'localstorage' : 'ionic-storage';
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

**Características del fallback:**

1. **Detección automática**: Si Ionic Storage falla, automáticamente cambia a localStorage
2. **Backup dual**: Cuando Ionic Storage funciona, también guarda en localStorage como respaldo
3. **Transparente**: El resto del código no necesita cambios, el servicio maneja todo internamente
4. **Recuperación**: Si hay datos en localStorage y Ionic Storage falla, los carga automáticamente

**Cómo funciona el fallback:**

- **Inicialización**: Intenta crear Ionic Storage. Si falla, activa el flag `useLocalStorage`
- **Lectura**: Si `useLocalStorage` es `true`, lee de localStorage. Si es `false`, intenta Ionic Storage y si falla, cambia a localStorage
- **Escritura**: Si `useLocalStorage` es `true`, guarda solo en localStorage. Si es `false`, guarda en ambos (Ionic Storage + localStorage como backup)
- **Método de verificación**: Usa `getStorageType()` para saber qué almacenamiento está activo

**Ejemplo de uso en componente (opcional - para debugging):**

```typescript
// En home.page.ts o categories.page.ts
ngOnInit() {
  // Verificar qué almacenamiento se está usando
  const storageType = this.todoService.getStorageType();
  console.log('Almacenamiento activo:', storageType);
  
  if (storageType === 'localstorage') {
    console.warn('Usando localStorage como fallback');
  }
}
```

**Ventajas de esta implementación:**

- ✅ **Resiliente**: La app sigue funcionando aunque falle la base de datos
- ✅ **Sin pérdida de datos**: Los datos se mantienen en localStorage como respaldo
- ✅ **Automático**: No requiere intervención del usuario
- ✅ **Transparente**: Los componentes no necesitan saber qué almacenamiento se usa

### 2.4 Crear Componente Home con CRUD Completo

**Mejoras implementadas:**

1. **Conexión Tareas-Categorías:**
   - Selector de categorías con radio buttons al crear/editar tareas
   - Visualización de categorías con chips de colores en cada tarea
   - Filtro por categoría funcional
   - Asignación de categoría desde el filtro activo

2. **Eliminación de Tareas:**
   - Botón de eliminar visible en ambos lados del item (izquierda y derecha)
   - Confirmación antes de eliminar
   - Feedback visual con toast después de eliminar
   - Deslizar hacia la izquierda o derecha para eliminar

**Archivo: `src/app/home/home.page.ts`**

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { TodoService } from '../services/todo.service';
import { CategoryService } from '../services/category.service';
import { RemoteConfigService } from '../services/remote-config.service';
import { Todo } from '../models/todo.model';
import { Category } from '../models/category.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss']
})
export class HomePage implements OnInit, OnDestroy {
  todos: Todo[] = [];
  categories: Category[] = [];
  selectedCategoryId: string = 'all';
  showCategories: boolean = false;
  private destroy$ = new Subject<void>();

  constructor(
    private todoService: TodoService,
    private categoryService: CategoryService,
    private remoteConfigService: RemoteConfigService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    // Cargar feature flag de Remote Config
    this.showCategories = await this.remoteConfigService.getFeatureFlag('enableCategories');

    // Suscribirse a cambios de tareas
    this.todoService.todos$
      .pipe(takeUntil(this.destroy$))
      .subscribe(todos => {
        this.filterTodos();
      });

    // Suscribirse a cambios de categorías
    this.categoryService.categories$
      .pipe(takeUntil(this.destroy$))
      .subscribe(categories => {
        this.categories = categories;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  filterTodos() {
    const allTodos = this.todoService.getAllTodos();
    if (this.selectedCategoryId === 'all') {
      this.todos = allTodos;
    } else {
      this.todos = allTodos.filter(t => t.categoryId === this.selectedCategoryId);
    }
  }

  async onCategoryFilterChange(event: any) {
    this.selectedCategoryId = event.detail.value;
    this.filterTodos();
  }

  async createTodo() {
    let selectedCategoryId = this.selectedCategoryId !== 'all' ? this.selectedCategoryId : '';

    const inputs: any[] = [
      {
        name: 'title',
        type: 'text',
        placeholder: 'Título de la tarea',
        attributes: {
          maxlength: 100,
          required: true
        }
      },
      {
        name: 'description',
        type: 'textarea',
        placeholder: 'Descripción (opcional)',
        attributes: {
          maxlength: 500
        }
      }
    ];

    const alert = await this.alertController.create({
      header: 'Nueva Tarea',
      inputs: inputs,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        ...(this.showCategories && this.categories.length > 0 ? [{
          text: 'Seleccionar Categoría',
          handler: async () => {
            const category = await this.showCategorySelector('Seleccionar Categoría', selectedCategoryId);
            if (category !== null) {
              selectedCategoryId = category;
            }
            return false; // No cerrar el alert
          }
        }] : []),
        {
          text: 'Crear',
          handler: async (data) => {
            if (data.title && data.title.trim()) {
              try {
                await this.todoService.createTodo(
                  data.title.trim(),
                  data.description?.trim(),
                  selectedCategoryId && selectedCategoryId !== 'all' ? selectedCategoryId : undefined
                );
                await this.showToast('Tarea creada exitosamente', 'success');
              } catch (error) {
                await this.showToast('Error al crear la tarea', 'danger');
              }
            }
          }
        }
      ]
    });

    await alert.present();
  }

  private async showCategorySelector(header: string, selectedValue: string = ''): Promise<string | null> {
    return new Promise(async (resolve) => {
      const inputs: any[] = [
        {
          name: 'category',
          type: 'radio',
          label: 'Sin categoría',
          value: '',
          checked: !selectedValue
        }
      ];

      // Agregar cada categoría como opción de radio
      this.categories.forEach(cat => {
        inputs.push({
          name: 'category',
          type: 'radio',
          label: cat.name,
          value: cat.id,
          checked: selectedValue === cat.id
        });
      });

      const alert = await this.alertController.create({
        header: header,
        inputs: inputs,
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel',
            handler: () => resolve(null)
          },
          {
            text: 'Seleccionar',
            handler: (data) => {
              resolve(data || '');
            }
          }
        ]
      });

      await alert.present();
    });
  }

  async editTodo(todo: Todo) {
    const inputs: any[] = [
      {
        name: 'title',
        type: 'text',
        value: todo.title,
        placeholder: 'Título de la tarea',
        attributes: {
          maxlength: 100,
          required: true
        }
      },
      {
        name: 'description',
        type: 'textarea',
        value: todo.description || '',
        placeholder: 'Descripción (opcional)',
        attributes: {
          maxlength: 500
        }
      }
    ];

    let selectedCategoryId = todo.categoryId || '';

    const alert = await this.alertController.create({
      header: 'Editar Tarea',
      inputs: inputs,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Cambiar Categoría',
          handler: async () => {
            if (this.showCategories && this.categories.length > 0) {
              const category = await this.showCategorySelector('Seleccionar Categoría', selectedCategoryId);
              if (category !== null) {
                selectedCategoryId = category;
              }
            }
            return false; // No cerrar el alert
          }
        },
        {
          text: 'Guardar',
          handler: async (data) => {
            if (data.title && data.title.trim()) {
              try {
                await this.todoService.updateTodo(todo.id, {
                  title: data.title.trim(),
                  description: data.description?.trim(),
                  categoryId: selectedCategoryId && selectedCategoryId !== 'all' ? selectedCategoryId : undefined
                });
                await this.showToast('Tarea actualizada exitosamente', 'success');
              } catch (error) {
                await this.showToast('Error al actualizar la tarea', 'danger');
              }
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async toggleComplete(id: string) {
    try {
      await this.todoService.toggleComplete(id);
    } catch (error) {
      await this.showToast('Error al actualizar la tarea', 'danger');
    }
  }

  async deleteTodo(id: string) {
    const alert = await this.alertController.create({
      header: 'Confirmar Eliminación',
      message: '¿Estás seguro de que deseas eliminar esta tarea?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              await this.todoService.deleteTodo(id);
              await this.showToast('Tarea eliminada exitosamente', 'success');
            } catch (error) {
              await this.showToast('Error al eliminar la tarea', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  getCategoryName(categoryId?: string): string {
    if (!categoryId) return 'Sin categoría';
    const category = this.categories.find(c => c.id === categoryId);
    return category ? category.name : 'Sin categoría';
  }

  getCategoryColor(categoryId?: string): string {
    if (!categoryId) return '#999';
    const category = this.categories.find(c => c.id === categoryId);
    return category ? category.color : '#999';
  }

  getContrastColor(hexColor: string): string {
    // Función para obtener color de texto contrastante (blanco o negro)
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
  }

  trackByTodoId(index: number, todo: Todo): string {
    return todo.id;
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
```

**Archivo: `src/app/home/home.page.html`**

```html
<ion-header [translucent]="true">
  <ion-toolbar>
    <ion-title>To-Do List</ion-title>
  </ion-toolbar>
</ion-header>

<ion-content [fullscreen]="true">
  <ion-header collapse="condense">
    <ion-toolbar>
      <ion-title size="large">To-Do List</ion-title>
    </ion-toolbar>
  </ion-header>

  <!-- Filtro de categorías (solo si está habilitado por Remote Config) -->
  <ion-item *ngIf="showCategories && categories.length > 0">
    <ion-label>Filtrar por categoría</ion-label>
    <ion-select 
      [(ngModel)]="selectedCategoryId" 
      (ionChange)="onCategoryFilterChange($event)"
      interface="popover">
      <ion-select-option value="all">Todas las tareas</ion-select-option>
      <ion-select-option *ngFor="let category of categories" [value]="category.id">
        {{ category.name }}
      </ion-select-option>
    </ion-select>
  </ion-item>

  <!-- Estado vacío -->
  <div *ngIf="todos.length === 0" class="empty-state">
    <ion-icon name="checkmark-circle-outline" size="large"></ion-icon>
    <p>No hay tareas. ¡Crea una nueva!</p>
  </div>

  <!-- Lista de tareas con trackBy para optimización -->
  <ion-list *ngIf="todos.length > 0">
    <ion-item-sliding 
      *ngFor="let todo of todos; trackBy: trackByTodoId"
      [attr.data-id]="todo.id">
      
      <ion-item [class.completed]="todo.completed">
        <ion-checkbox 
          slot="start"
          [checked]="todo.completed" 
          (ionChange)="toggleComplete(todo.id)">
        </ion-checkbox>
        
        <ion-label (click)="editTodo(todo)">
          <h2 [class.completed-text]="todo.completed">{{ todo.title }}</h2>
          <p *ngIf="todo.description">{{ todo.description }}</p>
          <div *ngIf="showCategories" class="category-badge">
            <ion-chip 
              *ngIf="todo.categoryId" 
              [style.background-color]="getCategoryColor(todo.categoryId)"
              [style.color]="getContrastColor(getCategoryColor(todo.categoryId))">
              <ion-icon name="pricetag-outline"></ion-icon>
              <ion-label>{{ getCategoryName(todo.categoryId) }}</ion-label>
            </ion-chip>
            <ion-chip *ngIf="!todo.categoryId" color="medium" outline>
              <ion-icon name="pricetag-outline"></ion-icon>
              <ion-label>Sin categoría</ion-label>
            </ion-chip>
          </div>
        </ion-label>
      </ion-item>
      
      <ion-item-options side="end">
        <ion-item-option color="primary" (click)="editTodo(todo)">
          <ion-icon slot="icon-only" name="create"></ion-icon>
          Editar
        </ion-item-option>
        <ion-item-option color="danger" expandable (click)="deleteTodo(todo.id)">
          <ion-icon slot="icon-only" name="trash"></ion-icon>
          Eliminar
        </ion-item-option>
      </ion-item-options>
      
      <!-- Opción de eliminar desde el inicio también -->
      <ion-item-options side="start">
        <ion-item-option color="danger" (click)="deleteTodo(todo.id)">
          <ion-icon slot="icon-only" name="trash"></ion-icon>
        </ion-item-option>
      </ion-item-options>
    </ion-item-sliding>
  </ion-list>

  <!-- Botón flotante para agregar -->
  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button (click)="createTodo()">
      <ion-icon name="add"></ion-icon>
    </ion-fab-button>
  </ion-fab>
</ion-content>
```

**Archivo: `src/app/home/home.page.scss`**

```scss
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 50vh;
  text-align: center;
  color: var(--ion-color-medium);

  ion-icon {
    font-size: 64px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  p {
    font-size: 16px;
    margin: 0;
  }
}

ion-item {
  &.completed {
    opacity: 0.6;
  }

  ion-label {
    h2.completed-text {
      text-decoration: line-through;
      color: var(--ion-color-medium);
    }

    p {
      font-size: 12px;
      margin-top: 4px;
      color: var(--ion-color-medium-shade);
    }

    .category-badge {
      margin-top: 8px;
      display: flex;
      align-items: center;
      gap: 8px;

      ion-chip {
        margin: 0;
        height: 24px;
        font-size: 12px;

        ion-icon {
          font-size: 14px;
        }
      }
    }
  }
}

ion-checkbox {
  margin-right: 16px;
}

// Optimización: Evitar reflows innecesarios
ion-item-sliding {
  contain: layout style paint;
}

// Estilos para botones de eliminar
ion-item-option[color="danger"] {
  --background: var(--ion-color-danger);
  --color: var(--ion-color-danger-contrast);
}
```

**Archivo: `src/app/home/home.module.ts`**

```typescript
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { HomePageRoutingModule } from './home-routing.module';
import { HomePage } from './home.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    HomePageRoutingModule
  ],
  declarations: [HomePage]
})
export class HomePageModule {}
```

---

## 3. SISTEMA DE CATEGORÍAS

### 3.1 Crear Modelo de Categoría

**Archivo: `src/app/models/category.model.ts`**

```typescript
export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
  createdAt: number;
  updatedAt: number;
}
```

### 3.2 Crear Servicio de Categorías

**Archivo: `src/app/services/category.service.ts`**

```typescript
import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { Category } from '../models/category.model';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private categoriesSubject = new BehaviorSubject<Category[]>([]);
  public categories$: Observable<Category[]> = this.categoriesSubject.asObservable();
  private readonly storageKey = 'categories';
  private storageInitialized = false;
  
  private readonly defaultColors = [
    '#3880ff', '#3dc2ff', '#2dd36f', 
    '#ffc409', '#eb445a', '#92949c', 
    '#f4f5f8', '#222428'
  ];

  constructor(private storage: Storage) {
    this.init();
  }

  private async init(): Promise<void> {
    try {
      await this.storage.create();
      this.storageInitialized = true;
      await this.loadCategories();
    } catch (error) {
      console.error('Error initializing storage:', error);
    }
  }

  private async loadCategories(): Promise<void> {
    if (!this.storageInitialized) {
      await this.init();
    }
    try {
      const categories = await this.storage.get(this.storageKey) || [];
      this.categoriesSubject.next(categories);
    } catch (error) {
      console.error('Error loading categories:', error);
      this.categoriesSubject.next([]);
    }
  }

  async createCategory(name: string, color?: string, icon?: string): Promise<Category> {
    if (!this.storageInitialized) {
      await this.init();
    }

    const newCategory: Category = {
      id: this.generateId(),
      name: name.trim(),
      color: color || this.getRandomColor(),
      icon,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const categories = this.categoriesSubject.value;
    
    // Validar que no exista una categoría con el mismo nombre
    if (categories.some(c => c.name.toLowerCase() === newCategory.name.toLowerCase())) {
      throw new Error('Ya existe una categoría con ese nombre');
    }

    categories.push(newCategory);
    
    try {
      await this.storage.set(this.storageKey, categories);
      this.categoriesSubject.next([...categories]);
      return newCategory;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  async updateCategory(id: string, updates: Partial<Category>): Promise<void> {
    if (!this.storageInitialized) {
      await this.init();
    }

    const categories = this.categoriesSubject.value;
    const index = categories.findIndex(c => c.id === id);
    
    if (index === -1) {
      throw new Error(`Category with id ${id} not found`);
    }

    // Validar nombre único si se está cambiando
    if (updates.name) {
      const nameExists = categories.some(
        (c, i) => i !== index && c.name.toLowerCase() === updates.name!.toLowerCase()
      );
      if (nameExists) {
        throw new Error('Ya existe una categoría con ese nombre');
      }
    }

    categories[index] = {
      ...categories[index],
      ...updates,
      name: updates.name?.trim() || categories[index].name,
      updatedAt: Date.now()
    };

    try {
      await this.storage.set(this.storageKey, categories);
      this.categoriesSubject.next([...categories]);
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  async deleteCategory(id: string): Promise<void> {
    if (!this.storageInitialized) {
      await this.init();
    }

    const categories = this.categoriesSubject.value.filter(c => c.id !== id);
    
    try {
      await this.storage.set(this.storageKey, categories);
      this.categoriesSubject.next([...categories]);
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }

  getCategoryById(id: string): Category | undefined {
    return this.categoriesSubject.value.find(c => c.id === id);
  }

  getAllCategories(): Category[] {
    return this.categoriesSubject.value;
  }

  private getRandomColor(): string {
    return this.defaultColors[Math.floor(Math.random() * this.defaultColors.length)];
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### 3.2.1 Versión Mejorada con Fallback a localStorage

**Versión mejorada del servicio de categorías con fallback automático a localStorage:**

**Archivo: `src/app/services/category.service.ts` (Versión con Fallback)**

```typescript
import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { Category } from '../models/category.model';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private categoriesSubject = new BehaviorSubject<Category[]>([]);
  public categories$: Observable<Category[]> = this.categoriesSubject.asObservable();
  private readonly storageKey = 'categories';
  private storageInitialized = false;
  private useLocalStorage = false; // Flag para saber qué almacenamiento usar
  
  private readonly defaultColors = [
    '#3880ff', '#3dc2ff', '#2dd36f', 
    '#ffc409', '#eb445a', '#92949c', 
    '#f4f5f8', '#222428'
  ];

  constructor(private storage: Storage) {
    this.init();
  }

  private async init(): Promise<void> {
    try {
      await this.storage.create();
      this.storageInitialized = true;
      this.useLocalStorage = false;
      await this.loadCategories();
    } catch (error) {
      console.warn('Ionic Storage falló, usando localStorage como fallback:', error);
      this.useLocalStorage = true;
      this.storageInitialized = true;
      await this.loadCategories();
    }
  }

  private async loadCategories(): Promise<void> {
    if (!this.storageInitialized) {
      await this.init();
    }
    
    try {
      let categories: Category[] = [];
      
      if (this.useLocalStorage) {
        // Usar localStorage como fallback
        const stored = localStorage.getItem(this.storageKey);
        categories = stored ? JSON.parse(stored) : [];
      } else {
        // Intentar usar Ionic Storage
        try {
          categories = await this.storage.get(this.storageKey) || [];
        } catch (error) {
          console.warn('Error al leer de Ionic Storage, cambiando a localStorage:', error);
          this.useLocalStorage = true;
          const stored = localStorage.getItem(this.storageKey);
          categories = stored ? JSON.parse(stored) : [];
        }
      }
      
      this.categoriesSubject.next(categories);
    } catch (error) {
      console.error('Error loading categories:', error);
      this.categoriesSubject.next([]);
    }
  }

  private async saveCategories(categories: Category[]): Promise<void> {
    try {
      if (this.useLocalStorage) {
        // Guardar en localStorage
        localStorage.setItem(this.storageKey, JSON.stringify(categories));
      } else {
        // Intentar guardar en Ionic Storage
        try {
          await this.storage.set(this.storageKey, categories);
          // También guardar en localStorage como backup
          localStorage.setItem(this.storageKey, JSON.stringify(categories));
        } catch (error) {
          console.warn('Error al guardar en Ionic Storage, usando localStorage:', error);
          this.useLocalStorage = true;
          localStorage.setItem(this.storageKey, JSON.stringify(categories));
        }
      }
    } catch (error) {
      console.error('Error saving categories:', error);
      throw error;
    }
  }

  async createCategory(name: string, color?: string, icon?: string): Promise<Category> {
    if (!this.storageInitialized) {
      await this.init();
    }

    const newCategory: Category = {
      id: this.generateId(),
      name: name.trim(),
      color: color || this.getRandomColor(),
      icon,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const categories = this.categoriesSubject.value;
    
    // Validar que no exista una categoría con el mismo nombre
    if (categories.some(c => c.name.toLowerCase() === newCategory.name.toLowerCase())) {
      throw new Error('Ya existe una categoría con ese nombre');
    }

    categories.push(newCategory);
    
    try {
      await this.saveCategories(categories);
      this.categoriesSubject.next([...categories]);
      return newCategory;
    } catch (error) {
      console.error('Error creating category:', error);
      throw error;
    }
  }

  async updateCategory(id: string, updates: Partial<Category>): Promise<void> {
    if (!this.storageInitialized) {
      await this.init();
    }

    const categories = this.categoriesSubject.value;
    const index = categories.findIndex(c => c.id === id);
    
    if (index === -1) {
      throw new Error(`Category with id ${id} not found`);
    }

    // Validar nombre único si se está cambiando
    if (updates.name) {
      const nameExists = categories.some(
        (c, i) => i !== index && c.name.toLowerCase() === updates.name!.toLowerCase()
      );
      if (nameExists) {
        throw new Error('Ya existe una categoría con ese nombre');
      }
    }

    categories[index] = {
      ...categories[index],
      ...updates,
      name: updates.name?.trim() || categories[index].name,
      updatedAt: Date.now()
    };

    try {
      await this.saveCategories(categories);
      this.categoriesSubject.next([...categories]);
    } catch (error) {
      console.error('Error updating category:', error);
      throw error;
    }
  }

  async deleteCategory(id: string): Promise<void> {
    if (!this.storageInitialized) {
      await this.init();
    }

    const categories = this.categoriesSubject.value.filter(c => c.id !== id);
    
    try {
      await this.saveCategories(categories);
      this.categoriesSubject.next([...categories]);
    } catch (error) {
      console.error('Error deleting category:', error);
      throw error;
    }
  }

  getCategoryById(id: string): Category | undefined {
    return this.categoriesSubject.value.find(c => c.id === id);
  }

  getAllCategories(): Category[] {
    return this.categoriesSubject.value;
  }

  // Método para verificar qué almacenamiento se está usando
  getStorageType(): 'ionic-storage' | 'localstorage' {
    return this.useLocalStorage ? 'localstorage' : 'ionic-storage';
  }

  private getRandomColor(): string {
    return this.defaultColors[Math.floor(Math.random() * this.defaultColors.length)];
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

**Nota**: Este servicio de categorías usa la misma lógica de fallback que el servicio de tareas. Si Ionic Storage falla, automáticamente usa localStorage. Ambos servicios mantienen sincronización independiente y pueden usar diferentes métodos de almacenamiento si es necesario.

### 3.3 Crear Página de Categorías

**Archivo: `src/app/categories/categories.page.ts`**

```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { CategoryService } from '../services/category.service';
import { Category } from '../models/category.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-categories',
  templateUrl: './categories.page.html',
  styleUrls: ['./categories.page.scss']
})
export class CategoriesPage implements OnInit, OnDestroy {
  categories: Category[] = [];
  private destroy$ = new Subject<void>();

  private readonly colorPalette = [
    { name: 'Azul', value: '#3880ff' },
    { name: 'Cyan', value: '#3dc2ff' },
    { name: 'Verde', value: '#2dd36f' },
    { name: 'Amarillo', value: '#ffc409' },
    { name: 'Rojo', value: '#eb445a' },
    { name: 'Gris', value: '#92949c' }
  ];

  constructor(
    private categoryService: CategoryService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    this.categoryService.categories$
      .pipe(takeUntil(this.destroy$))
      .subscribe(categories => {
        this.categories = categories;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  async createCategory() {
    const alert = await this.alertController.create({
      header: 'Nueva Categoría',
      inputs: [
        {
          name: 'name',
          type: 'text',
          placeholder: 'Nombre de la categoría',
          attributes: {
            maxlength: 50,
            required: true
          }
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Crear',
          handler: async (data) => {
            if (data.name && data.name.trim()) {
              try {
                await this.categoryService.createCategory(data.name.trim());
                await this.showToast('Categoría creada exitosamente', 'success');
              } catch (error: any) {
                await this.showToast(error.message || 'Error al crear la categoría', 'danger');
              }
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async editCategory(category: Category) {
    const alert = await this.alertController.create({
      header: 'Editar Categoría',
      inputs: [
        {
          name: 'name',
          type: 'text',
          value: category.name,
          placeholder: 'Nombre de la categoría',
          attributes: {
            maxlength: 50,
            required: true
          }
        }
      ],
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Guardar',
          handler: async (data) => {
            if (data.name && data.name.trim()) {
              try {
                await this.categoryService.updateCategory(category.id, { 
                  name: data.name.trim() 
                });
                await this.showToast('Categoría actualizada exitosamente', 'success');
              } catch (error: any) {
                await this.showToast(error.message || 'Error al actualizar la categoría', 'danger');
              }
            }
          }
        }
      ]
    });

    await alert.present();
  }

  async deleteCategory(id: string) {
    const alert = await this.alertController.create({
      header: 'Confirmar Eliminación',
      message: '¿Estás seguro de que deseas eliminar esta categoría? Las tareas asociadas no se eliminarán.',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              await this.categoryService.deleteCategory(id);
              await this.showToast('Categoría eliminada exitosamente', 'success');
            } catch (error) {
              await this.showToast('Error al eliminar la categoría', 'danger');
            }
          }
        }
      ]
    });

    await alert.present();
  }

  trackByCategoryId(index: number, category: Category): string {
    return category.id;
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom'
    });
    await toast.present();
  }
}
```

**Archivo: `src/app/categories/categories.page.html`**

```html
<ion-header [translucent]="true">
  <ion-toolbar>
    <ion-title>Categorías</ion-title>
  </ion-toolbar>
</ion-header>

<ion-content [fullscreen]="true">
  <ion-header collapse="condense">
    <ion-toolbar>
      <ion-title size="large">Categorías</ion-title>
    </ion-toolbar>
  </ion-header>

  <!-- Estado vacío -->
  <div *ngIf="categories.length === 0" class="empty-state">
    <ion-icon name="pricetag-outline" size="large"></ion-icon>
    <p>No hay categorías. ¡Crea una nueva!</p>
  </div>

  <!-- Lista de categorías -->
  <ion-list *ngIf="categories.length > 0">
    <ion-item-sliding 
      *ngFor="let category of categories; trackBy: trackByCategoryId"
      [attr.data-id]="category.id">
      
      <ion-item>
        <ion-label>
          <div class="category-item">
            <div class="color-indicator" [style.background-color]="category.color"></div>
            <div class="category-info">
              <h2>{{ category.name }}</h2>
              <p>Creada: {{ category.createdAt | date:'short' }}</p>
            </div>
          </div>
        </ion-label>
      </ion-item>
      
      <ion-item-options side="end">
        <ion-item-option color="primary" (click)="editCategory(category)">
          <ion-icon slot="icon-only" name="create"></ion-icon>
          Editar
        </ion-item-option>
        <ion-item-option color="danger" (click)="deleteCategory(category.id)">
          <ion-icon slot="icon-only" name="trash"></ion-icon>
          Eliminar
        </ion-item-option>
      </ion-item-options>
    </ion-item-sliding>
  </ion-list>

  <!-- Botón flotante para agregar -->
  <ion-fab vertical="bottom" horizontal="end" slot="fixed">
    <ion-fab-button (click)="createCategory()">
      <ion-icon name="add"></ion-icon>
    </ion-fab-button>
  </ion-fab>
</ion-content>
```

**Archivo: `src/app/categories/categories.page.scss`**

```scss
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 50vh;
  text-align: center;
  color: var(--ion-color-medium);

  ion-icon {
    font-size: 64px;
    margin-bottom: 16px;
    opacity: 0.5;
  }

  p {
    font-size: 16px;
    margin: 0;
  }
}

.category-item {
  display: flex;
  align-items: center;
  gap: 12px;

  .color-indicator {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .category-info {
    flex: 1;

    h2 {
      margin: 0 0 4px 0;
      font-size: 16px;
    }

    p {
      margin: 0;
      font-size: 12px;
      color: var(--ion-color-medium);
    }
  }
}
```

**Archivo: `src/app/categories/categories.module.ts`**

```typescript
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { CategoriesPageRoutingModule } from './categories-routing.module';
import { CategoriesPage } from './categories.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    CategoriesPageRoutingModule
  ],
  declarations: [CategoriesPage]
})
export class CategoriesPageModule {}
```

---

## 4. FIREBASE + REMOTE CONFIG

### 4.1 Configurar Firebase en Firebase Console

1. Ir a [Firebase Console](https://console.firebase.google.com/)
2. Crear nuevo proyecto: `todo-app`
3. Ir a **Project Settings** (⚙️)
4. En la sección **Your apps**, agregar app Android:
   - Package name: `com.todoapp.app` (debe coincidir con `config.xml`)
   - Descargar `google-services.json`
5. Agregar app iOS:
   - Bundle ID: `com.todoapp.app`
   - Descargar `GoogleService-Info.plist`

### 4.2 Configurar Remote Config

1. En Firebase Console, ir a **Remote Config**
2. Click en **Crear configuración** (primera vez)
3. Click en **Agregar parámetro**
4. Configurar:
   - **Clave**: `enableCategories`
   - **Tipo**: Boolean
   - **Valor por defecto**: `false`
   - **Descripción**: "Habilita/deshabilita el sistema de categorías"
5. Click en **Publicar cambios**

### 4.3 Configurar Archivos de Entorno

**Archivo: `src/environments/environment.ts`**

```typescript
export const environment = {
  production: false,
  firebase: {
    apiKey: "TU_API_KEY",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto-id",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890"
  }
};
```

**Archivo: `src/environments/environment.prod.ts`**

```typescript
export const environment = {
  production: true,
  firebase: {
    apiKey: "TU_API_KEY",
    authDomain: "tu-proyecto.firebaseapp.com",
    projectId: "tu-proyecto-id",
    storageBucket: "tu-proyecto.appspot.com",
    messagingSenderId: "123456789012",
    appId: "1:123456789012:web:abcdef1234567890"
  }
};
```

### 4.4 Agregar Archivos Nativos de Firebase

**Para Android:**

1. Copiar `google-services.json` a:
   ```
   platforms/android/app/google-services.json
   ```

2. Verificar que `platforms/android/app/build.gradle` incluya:
   ```gradle
   apply plugin: 'com.google.gms.google-services'
   ```

3. Verificar que `platforms/android/build.gradle` incluya:
   ```gradle
   dependencies {
       classpath 'com.google.gms:google-services:4.3.15'
   }
   ```

**Para iOS:**

1. Copiar `GoogleService-Info.plist` a:
   ```
   platforms/ios/App/App/GoogleService-Info.plist
   ```

2. Agregar el archivo al proyecto Xcode:
   - Abrir `platforms/ios/App.xcworkspace` en Xcode
   - Arrastrar `GoogleService-Info.plist` a la carpeta del proyecto
   - Asegurarse de que esté marcado en "Copy items if needed"

### 4.5 Instalar Plugin de Firebase para Cordova

```bash
# Plugin para Firebase en Cordova
ionic cordova plugin add cordova-plugin-firebase
npm install @ionic-native/firebase

# O usar solo Angular Fire (recomendado para Remote Config)
# Ya está instalado: @angular/fire
```

### 4.6 Crear Servicio de Remote Config

**Archivo: `src/app/services/remote-config.service.ts`**

```typescript
import { Injectable } from '@angular/core';
import { AngularFireRemoteConfig } from '@angular/fire/compat/remote-config';
import { Observable, from } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RemoteConfigService {
  private cacheExpiry = 60 * 60 * 1000; // 1 hora
  private cachedFlags: Map<string, any> = new Map();
  private cacheTime: number = 0;

  constructor(private remoteConfig: AngularFireRemoteConfig) {
    this.init();
  }

  private async init(): Promise<void> {
    try {
      // Configurar valores por defecto
      this.remoteConfig.defaultConfig = {
        enableCategories: false
      };

      // Activar Remote Config
      await this.remoteConfig.fetchAndActivate();
    } catch (error) {
      console.error('Error initializing Remote Config:', error);
    }
  }

  async getFeatureFlag(flagName: string): Promise<boolean> {
    // Verificar caché
    const now = Date.now();
    if (this.cachedFlags.has(flagName) && (now - this.cacheTime) < this.cacheExpiry) {
      return this.cachedFlags.get(flagName);
    }

    try {
      // Obtener valor actualizado
      await this.remoteConfig.fetchAndActivate();
      const value = this.remoteConfig.getBoolean(flagName);
      
      // Actualizar caché
      this.cachedFlags.set(flagName, value);
      this.cacheTime = now;
      
      return value;
    } catch (error) {
      console.error(`Error getting flag ${flagName}:`, error);
      // Retornar valor por defecto o del caché
      return this.cachedFlags.get(flagName) || false;
    }
  }

  getFeatureFlag$(flagName: string): Observable<boolean> {
    return from(this.remoteConfig.fetchAndActivate()).pipe(
      map(() => {
        const value = this.remoteConfig.getBoolean(flagName);
        this.cachedFlags.set(flagName, value);
        this.cacheTime = Date.now();
        return value;
      }),
      catchError(error => {
        console.error(`Error getting flag ${flagName}:`, error);
        return of(this.cachedFlags.get(flagName) || false);
      })
    );
  }

  async refreshConfig(): Promise<void> {
    try {
      await this.remoteConfig.fetchAndActivate();
      this.cacheTime = Date.now();
    } catch (error) {
      console.error('Error refreshing config:', error);
    }
  }

  getString(key: string): string {
    return this.remoteConfig.getString(key);
  }

  getNumber(key: string): number {
    return this.remoteConfig.getNumber(key);
  }
}
```

### 4.7 Actualizar config.xml para Firebase

**Archivo: `config.xml`**

```xml
<?xml version='1.0' encoding='utf-8'?>
<widget id="com.todoapp.app" version="1.0.0" xmlns="http://www.w3.org/ns/widgets" xmlns:cdv="http://cordova.apache.org/ns/1.0">
    <name>To-Do App</name>
    <description>To-Do List Application with Firebase</description>
    <author email="dev@example.com" href="https://example.com">Your Name</author>
    <content src="index.html" />
    
    <access origin="*" />
    <allow-intent href="http://*/*" />
    <allow-intent href="https://*/*" />
    
    <platform name="android">
        <allow-intent href="market:*" />
        <!-- Firebase config -->
        <resource-file src="google-services.json" target="app/google-services.json" />
    </platform>
    
    <platform name="ios">
        <allow-intent href="itms:*" />
        <allow-intent href="itms-apps:*" />
        <!-- Firebase config -->
        <resource-file src="GoogleService-Info.plist" target="App/App/GoogleService-Info.plist" />
    </platform>
    
    <plugin name="cordova-plugin-whitelist" spec="^1.3.4" />
    <plugin name="cordova-plugin-statusbar" spec="^2.4.3" />
    <plugin name="cordova-plugin-device" spec="^2.0.3" />
</widget>
```

---

## 5. OPTIMIZACIONES

### 5.1 Lazy Loading

**Archivo: `src/app/app-routing.module.ts`**

```typescript
import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then(m => m.HomePageModule)
  },
  {
    path: 'categories',
    loadChildren: () => import('./categories/categories.module').then(m => m.CategoriesPageModule)
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'home'
  }
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { 
      preloadingStrategy: PreloadAllModules,
      enableTracing: false
    })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule {}
```

### 5.2 Virtual Scroll para Listas Grandes

**Instalar dependencia:**
```bash
npm install @angular/cdk
```

**Archivo: `src/app/home/home.page.html` (versión optimizada)**

```html
<!-- Usar virtual scroll para listas > 50 items -->
<cdk-virtual-scroll-viewport 
  *ngIf="todos.length > 50" 
  itemSize="80" 
  class="virtual-scroll-viewport">
  <ion-item-sliding 
    *cdkVirtualFor="let todo of todos; trackBy: trackByTodoId"
    [attr.data-id]="todo.id">
    <!-- Contenido del item -->
  </ion-item-sliding>
</cdk-virtual-scroll-viewport>

<!-- Lista normal para < 50 items -->
<ion-list *ngIf="todos.length <= 50">
  <ion-item-sliding 
    *ngFor="let todo of todos; trackBy: trackByTodoId"
    [attr.data-id]="todo.id">
    <!-- Contenido del item -->
  </ion-item-sliding>
</ion-list>
```

**Archivo: `src/app/home/home.module.ts` (agregar ScrollingModule)**

```typescript
import { ScrollingModule } from '@angular/cdk/scrolling';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ScrollingModule, // Agregar esto
    HomePageRoutingModule
  ],
  declarations: [HomePage]
})
export class HomePageModule {}
```

**Archivo: `src/app/home/home.page.scss` (estilos virtual scroll)**

```scss
.virtual-scroll-viewport {
  height: 100%;
  width: 100%;
}

.cdk-virtual-scroll-content-wrapper {
  display: flex;
  flex-direction: column;
}
```

### 5.3 TrackBy en *ngFor

Ya implementado en los componentes anteriores. Ejemplo:

```typescript
trackByTodoId(index: number, todo: Todo): string {
  return todo.id;
}
```

```html
*ngFor="let todo of todos; trackBy: trackByTodoId"
```

### 5.4 Buen Uso de Observables y Unsubscribe

Ya implementado usando `takeUntil` pattern:

```typescript
private destroy$ = new Subject<void>();

ngOnInit() {
  this.service.data$
    .pipe(takeUntil(this.destroy$))
    .subscribe(data => {
      // ...
    });
}

ngOnDestroy() {
  this.destroy$.next();
  this.destroy$.complete();
}
```

### 5.5 Minimizar Uso de Memoria

**Archivo: `src/app/services/todo.service.ts` (optimizado)**

```typescript
// Agregar paginación
async getTodosPaginated(page: number, pageSize: number = 20): Promise<Todo[]> {
  const allTodos = this.todosSubject.value;
  const start = page * pageSize;
  const end = start + pageSize;
  return allTodos.slice(start, end);
}

// Limpiar tareas completadas antiguas
async cleanupOldCompletedTodos(daysOld: number = 30): Promise<void> {
  const cutoffDate = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
  const todos = this.todosSubject.value.filter(t => 
    !t.completed || t.updatedAt > cutoffDate
  );
  
  await this.storage.set(this.storageKey, todos);
  this.todosSubject.next([...todos]);
}
```

**Archivo: `src/app/home/home.page.ts` (agregar paginación)**

```typescript
currentPage = 0;
pageSize = 20;
hasMore = true;

async loadMore() {
  if (!this.hasMore) return;
  
  this.currentPage++;
  const newTodos = await this.todoService.getTodosPaginated(this.currentPage, this.pageSize);
  
  if (newTodos.length < this.pageSize) {
    this.hasMore = false;
  }
  
  this.todos = [...this.todos, ...newTodos];
}
```

---

## 6. ENTREGA FINAL

### 6.1 Estructura Completa del Proyecto

```
todo-app/
├── src/
│   ├── app/
│   │   ├── home/
│   │   │   ├── home.page.ts
│   │   │   ├── home.page.html
│   │   │   ├── home.page.scss
│   │   │   ├── home.module.ts
│   │   │   └── home-routing.module.ts
│   │   ├── categories/
│   │   │   ├── categories.page.ts
│   │   │   ├── categories.page.html
│   │   │   ├── categories.page.scss
│   │   │   ├── categories.module.ts
│   │   │   └── categories-routing.module.ts
│   │   ├── services/
│   │   │   ├── todo.service.ts
│   │   │   ├── category.service.ts
│   │   │   └── remote-config.service.ts
│   │   ├── models/
│   │   │   ├── todo.model.ts
│   │   │   └── category.model.ts
│   │   ├── app.component.ts
│   │   ├── app.module.ts
│   │   └── app-routing.module.ts
│   └── environments/
│       ├── environment.ts
│       └── environment.prod.ts
├── platforms/
│   ├── android/
│   │   └── app/
│   │       └── google-services.json
│   └── ios/
│       └── App/
│           └── App/
│               └── GoogleService-Info.plist
├── config.xml
├── package.json
└── README.md
```

### 6.2 Comandos Esenciales

```bash
# Instalación
npm install -g @ionic/cli@latest
ionic start todo-app tabs --type=angular --capacitor=false
cd todo-app
npm install @ionic/storage-angular firebase @angular/fire localforage-cordovasqlitedriver @angular/cdk

# Agregar plataformas
ionic cordova platform add android@latest
ionic cordova platform add ios@latest

# Desarrollo
ionic serve

# Build Android
ionic cordova build android --release --prod

# Build iOS
ionic cordova build ios --release --prod

# Ejecutar
ionic cordova run android
ionic cordova run ios
```

### 6.3 README.md Final

**Archivo: `README.md`**

```markdown
# To-Do App - Ionic 7 + Angular 17

Aplicación móvil de lista de tareas desarrollada con Ionic 7, Angular 17, Firebase Remote Config y Cordova.

## 🚀 Características

- ✅ CRUD completo de tareas
- 🏷️ Sistema de categorías con filtros
- 🔥 Firebase Remote Config para feature flags
- 💾 Persistencia local con Ionic Storage
- 📱 Compilación nativa para Android e iOS
- ⚡ Optimizaciones: lazy loading, virtual scroll, trackBy

## 📋 Requisitos

- Node.js >= 18.x
- npm >= 9.x
- Ionic CLI 7.x
- Android Studio (para Android)
- Xcode (para iOS, solo macOS)

## 🔧 Instalación

\`\`\`bash
# Clonar repositorio
git clone [URL_DEL_REPOSITORIO]
cd todo-app

# Instalar dependencias
npm install

# Instalar Ionic CLI si no está instalado
npm install -g @ionic/cli@latest
\`\`\`

## 🏃 Ejecución

### Desarrollo (Navegador)

\`\`\`bash
ionic serve
\`\`\`

### Android

\`\`\`bash
# Agregar plataforma (primera vez)
ionic cordova platform add android

# Compilar
ionic cordova build android

# Ejecutar en dispositivo/emulador
ionic cordova run android
\`\`\`

### iOS (solo macOS)

\`\`\`bash
# Agregar plataforma (primera vez)
ionic cordova platform add ios

# Compilar
ionic cordova build ios

# Ejecutar en dispositivo/simulador
ionic cordova run ios
\`\`\`

## 🔥 Configuración Firebase

1. Crear proyecto en [Firebase Console](https://console.firebase.google.com/)
2. Agregar apps Android e iOS
3. Descargar `google-services.json` (Android) y `GoogleService-Info.plist` (iOS)
4. Copiar archivos a:
   - `platforms/android/app/google-services.json`
   - `platforms/ios/App/App/GoogleService-Info.plist`
5. Configurar Remote Config:
   - Crear parámetro `enableCategories` (Boolean)
   - Valor por defecto: `false`
6. Actualizar `src/environments/environment.ts` con tus credenciales

## 📱 Estructura del Proyecto

\`\`\`
src/app/
├── home/              # Página principal con lista de tareas
├── categories/         # Gestión de categorías
├── services/          # Servicios (Todo, Category, RemoteConfig)
└── models/            # Interfaces y modelos
\`\`\`

## 🛠️ Tecnologías

- **Ionic 7**: Framework UI móvil
- **Angular 17**: Framework TypeScript
- **Cordova**: Compilación nativa
- **Firebase**: Remote Config
- **Ionic Storage**: Persistencia local

## 📝 Funcionalidades

### Tareas
- Crear, editar, eliminar tareas
- Marcar como completadas
- Filtrar por categoría
- Persistencia local

### Categorías
- Crear, editar, eliminar categorías
- Asignar categorías a tareas
- Filtros dinámicos
- Colores personalizados

### Remote Config
- Feature flag `enableCategories`
- Control remoto de funcionalidades
- Sin necesidad de actualizar la app

## 🐛 Troubleshooting

### Error: JIT compilation en IonicStorageModule
- Verificar que `localforage-cordovasqlitedriver` esté instalado
- Verificar configuración en `app.module.ts`

### Error: Firebase no inicializa
- Verificar credenciales en `environment.ts`
- Verificar que archivos nativos estén en las rutas correctas

### Error: Build falla
- Limpiar: `ionic cordova clean`
- Reinstalar: `npm install`
- Rebuild: `ionic cordova build android`

## 📄 Licencia

MIT

## 👤 Autor

[Tu Nombre]
\`\`\`
```

### 6.4 Checklist de Entrega

- [x] Aplicación Ionic 7 + Angular 17 funcionando
- [x] CRUD completo de tareas
- [x] CRUD completo de categorías
- [x] Filtros por categoría implementados
- [x] Ionic Storage configurado correctamente (sin errores JIT)
- [x] Firebase Remote Config integrado
- [x] Feature flag `enableCategories` funcionando
- [x] Archivos nativos de Firebase agregados (google-services.json, GoogleService-Info.plist)
- [x] Lazy loading implementado
- [x] Virtual scroll para listas grandes
- [x] TrackBy en todos los *ngFor
- [x] Unsubscribe correcto en todos los componentes
- [x] Optimizaciones de memoria aplicadas
- [x] Build Android exitoso
- [x] Build iOS exitoso (si aplica)
- [x] README completo y actualizado
- [x] Código comentado y organizado
- [x] Repositorio Git con commits descriptivos

---

## 🎯 RESUMEN TÉCNICO

### Puntos Clave Implementados

1. **Ionic Storage sin errores JIT**: Uso de `localforage-cordovasqlitedriver` y configuración correcta
2. **Firebase nativo**: Archivos `google-services.json` y `GoogleService-Info.plist` correctamente ubicados
3. **Remote Config**: Servicio con caché y manejo de errores
4. **Optimizaciones**: Lazy loading, virtual scroll, trackBy, unsubscribe pattern
5. **Compatibilidad**: Angular 17 + Ionic 7 + Cordova

### Errores Comunes Evitados

- ✅ JIT compilation error en IonicStorageModule → Solucionado con driver correcto
- ✅ Problemas con providers → `providedIn: 'root'` usado correctamente
- ✅ Compatibilidad Angular + Cordova → Versiones compatibles especificadas

---

**¡Listo para desarrollar y entregar la prueba técnica!** 🚀

