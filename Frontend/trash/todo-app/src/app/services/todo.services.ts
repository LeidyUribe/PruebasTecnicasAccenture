// todo.service.ts
import { Injectable } from '@angular/core';
import { Todo } from '../models/todo.models';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TodoService {
  private storageKey = 'todos';
  private todosSubject = new BehaviorSubject<Todo[]>([]);
  public todos$ = this.todosSubject.asObservable();

  constructor() {
    this.loadTodos();
  }

  private loadTodos() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const todos = JSON.parse(stored);
        // Convertir string de fecha a Date object
        const parsedTodos = todos.map((todo: any) => ({
          ...todo,
          createdAt: new Date(todo.createdAt)
        }));
        this.todosSubject.next(parsedTodos);
      }
    } catch (error) {
      console.error('Error loading todos:', error);
      this.todosSubject.next([]);
    }
  }

  private saveTodos(todos: Todo[]) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(todos));
      this.todosSubject.next(todos);
    } catch (error) {
      console.error('Error saving todos:', error);
    }
  }

  async addTodo(title: string, categoryId?: string): Promise<void> {
    const todos = this.todosSubject.value;
    const newTodo: Todo = {
      id: Date.now().toString(),
      title: title.trim(),
      completed: false,
      createdAt: new Date(),
      categoryId: categoryId
    };
    this.saveTodos([...todos, newTodo]);
  }

  async toggleTodo(id: string): Promise<void> {
    const todos = this.todosSubject.value.map(todo => 
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
    this.saveTodos(todos);
  }

  async deleteTodo(id: string): Promise<void> {
    const todos = this.todosSubject.value.filter(t => t.id !== id);
    this.saveTodos(todos);
  }

  getTodos(): Todo[] {
    return this.todosSubject.value;
  }

  // Método adicional para limpiar todos
  clearAll(): void {
    this.saveTodos([]);
  }
}