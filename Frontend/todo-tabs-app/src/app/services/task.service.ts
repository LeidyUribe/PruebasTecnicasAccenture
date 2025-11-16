import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { Task } from '../models/task.model';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private tasksSubject = new BehaviorSubject<Task[]>([]);
  public tasks$: Observable<Task[]> = this.tasksSubject.asObservable();
  private readonly storageKey = 'tasks';
  private storageInitialized = false;
  private useLocalStorage = false;

  constructor(private storage: Storage) {
    this.init();
  }

  private async init(): Promise<void> {
    try {
      await this.storage.create();
      this.storageInitialized = true;
      this.useLocalStorage = false;
      await this.loadTasks();
    } catch (error) {
      console.warn('Ionic Storage falló, usando localStorage:', error);
      this.useLocalStorage = true;
      this.storageInitialized = true;
      await this.loadTasks();
    }
  }

  private async loadTasks(): Promise<void> {
    if (!this.storageInitialized) {
      await this.init();
    }
    
    try {
      let tasks: Task[] = [];
      
      if (this.useLocalStorage) {
        const stored = localStorage.getItem(this.storageKey);
        tasks = stored ? JSON.parse(stored) : [];
      } else {
        try {
          tasks = await this.storage.get(this.storageKey) || [];
        } catch (error) {
          console.warn('Error al leer de Ionic Storage, usando localStorage:', error);
          this.useLocalStorage = true;
          const stored = localStorage.getItem(this.storageKey);
          tasks = stored ? JSON.parse(stored) : [];
        }
      }
      
      this.tasksSubject.next(tasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
      this.tasksSubject.next([]);
    }
  }

  private async saveTasks(tasks: Task[]): Promise<void> {
    try {
      if (this.useLocalStorage) {
        localStorage.setItem(this.storageKey, JSON.stringify(tasks));
      } else {
        try {
          await this.storage.set(this.storageKey, tasks);
          localStorage.setItem(this.storageKey, JSON.stringify(tasks));
        } catch (error) {
          console.warn('Error al guardar en Ionic Storage, usando localStorage:', error);
          this.useLocalStorage = true;
          localStorage.setItem(this.storageKey, JSON.stringify(tasks));
        }
      }
    } catch (error) {
      console.error('Error saving tasks:', error);
      throw error;
    }
  }

  async createTask(title: string, description?: string, categoryId?: string): Promise<Task> {
    if (!title || !title.trim()) {
      throw new Error('El título de la tarea es requerido');
    }

    if (!this.storageInitialized) {
      await this.init();
    }

    const newTask: Task = {
      id: this.generateId(),
      title: title.trim(),
      description: description?.trim(),
      completed: false,
      categoryId,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const tasks = this.tasksSubject.value;
    tasks.push(newTask);
    
    try {
      await this.saveTasks(tasks);
      this.tasksSubject.next([...tasks]);
      return newTask;
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<void> {
    if (!this.storageInitialized) {
      await this.init();
    }

    const tasks = this.tasksSubject.value;
    const index = tasks.findIndex(t => t.id === id);
    
    if (index === -1) {
      throw new Error(`Task with id ${id} not found`);
    }

    if (updates.title && !updates.title.trim()) {
      throw new Error('El título de la tarea es requerido');
    }

    tasks[index] = {
      ...tasks[index],
      ...updates,
      title: updates.title?.trim() || tasks[index].title,
      description: updates.description?.trim(),
      updatedAt: Date.now()
    };

    try {
      await this.saveTasks(tasks);
      this.tasksSubject.next([...tasks]);
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  }

  async toggleComplete(id: string): Promise<void> {
    const task = this.tasksSubject.value.find(t => t.id === id);
    if (task) {
      await this.updateTask(id, { completed: !task.completed });
    }
  }

  async deleteTask(id: string): Promise<void> {
    if (!this.storageInitialized) {
      await this.init();
    }

    const tasks = this.tasksSubject.value.filter(t => t.id !== id);
    
    try {
      await this.saveTasks(tasks);
      this.tasksSubject.next([...tasks]);
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  getTaskById(id: string): Task | undefined {
    return this.tasksSubject.value.find(t => t.id === id);
  }

  getAllTasks(): Task[] {
    return this.tasksSubject.value;
  }

  getTasksByCategory(categoryId: string): Observable<Task[]> {
    return this.tasks$.pipe(
      map(tasks => tasks.filter(t => t.categoryId === categoryId))
    );
  }

  getCompletedTasks(): Observable<Task[]> {
    return this.tasks$.pipe(
      map(tasks => tasks.filter(t => t.completed))
    );
  }

  getPendingTasks(): Observable<Task[]> {
    return this.tasks$.pipe(
      map(tasks => tasks.filter(t => !t.completed))
    );
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}