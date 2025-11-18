import { Component, OnInit, OnDestroy } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { TodoService } from '../services/todo.service';
import { CategoryService } from '../services/category.service';
// import { RemoteConfigService } from '../services/remote-config.service';
import { Todo } from '../models/todo.model';
import { Category } from '../models/category.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false
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
    // private remoteConfigService: RemoteConfigService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    // Cargar feature flag de Remote Config
    // this.showCategories = await this.remoteConfigService.getFeatureFlag('enableCategories');

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