import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { TodoService } from '../services/todo.service';
import { Todo } from '../models/todo.models';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class HomePage implements OnInit {
  todos: Todo[] = [];
  newTodoTitle = '';

  constructor(private todoService: TodoService) {}

  ngOnInit() {
    this.todoService.todos$.subscribe((todos) => {
      this.todos = todos;
    });
  }

  getCompletedCount(): number {
    return this.todos.filter((t) => t.completed).length;
  }

  async addTodo() {
    if (this.newTodoTitle.trim()) {
      await this.todoService.addTodo(this.newTodoTitle);
      this.newTodoTitle = '';
    }
  }

  async toggleTodo(id: string) {
    await this.todoService.toggleTodo(id);
  }

  async deleteTodo(id: string) {
    await this.todoService.deleteTodo(id);
  }
}
