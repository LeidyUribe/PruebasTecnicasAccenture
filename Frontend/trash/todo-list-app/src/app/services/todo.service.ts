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