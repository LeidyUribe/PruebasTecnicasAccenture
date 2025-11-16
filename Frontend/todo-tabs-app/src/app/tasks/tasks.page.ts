import { Component, OnInit, OnDestroy } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { TaskService } from '../services/task.service';
import { CategoryService } from '../services/category.service';
import { Task } from '../models/task.model';
import { Category } from '../models/category.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-tasks',
  templateUrl: './tasks.page.html',
  styleUrls: ['./tasks.page.scss'],
  standalone: false,
})
export class TasksPage implements OnInit, OnDestroy {
  tasks: Task[] = [];
  categories: Category[] = [];
  selectedCategoryId: string = 'all';
  private destroy$ = new Subject<void>();

  constructor(
    private taskService: TaskService,
    private categoryService: CategoryService,
    private alertController: AlertController,
    private toastController: ToastController
  ) {}

  ngOnInit() {
    // Suscribirse a cambios de tareas
    this.taskService.tasks$
      .pipe(takeUntil(this.destroy$))
      .subscribe((tasks) => {
        this.filterTasks();
      });

    // Suscribirse a cambios de categorías
    this.categoryService.categories$
      .pipe(takeUntil(this.destroy$))
      .subscribe((categories) => {
        this.categories = categories;
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  filterTasks() {
    const allTasks = this.taskService.getAllTasks();
    if (this.selectedCategoryId === 'all') {
      this.tasks = allTasks;
    } else {
      this.tasks = allTasks.filter(
        (t) => t.categoryId === this.selectedCategoryId
      );
    }
  }

  onCategoryFilterChange(event: any) {
    this.selectedCategoryId = event.detail.value;
    this.filterTasks();
  }

  // CREATE - Crear tarea
  async createTask() {
    let selectedCategoryId =
      this.selectedCategoryId !== 'all' ? this.selectedCategoryId : '';

    const inputs: any[] = [
      {
        name: 'title',
        type: 'text',
        placeholder: 'Título de la tarea',
        attributes: {
          maxlength: 100,
          required: true,
        },
      },
      {
        name: 'description',
        type: 'textarea',
        placeholder: 'Descripción (opcional)',
        attributes: {
          maxlength: 500,
        },
      },
    ];

    const alert = await this.alertController.create({
      header: 'Nueva Tarea',
      inputs: inputs,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        ...(this.categories.length > 0
          ? [
              {
                text: 'Seleccionar Categoría',
                handler: async () => {
                  const category = await this.showCategorySelector(
                    'Seleccionar Categoría',
                    selectedCategoryId
                  );
                  console.log(category)
                  if (category !== null) {
                    selectedCategoryId = category;
                  }
                  return false;
                },
              },
            ]
          : []),
        {
          text: 'Crear',
          handler: async (data): Promise<boolean> => {
            if (data.title?.trim()) {
              try {
                await this.taskService.createTask(
                  data.title.trim(),
                  data.categoryId
                );
                await this.showToast('Tarea creada exitosamente', 'success');
                return true;
              } catch (error) {
                await this.showToast('Error al crear la tarea', 'danger');
                return false;
              }
            } else {
              await this.showToast('El título es requerido', 'warning');
              return false;
            }
          },
        },
      ],
    });

    await alert.present();
  }

  private async showCategorySelector(
    header: string,
    selectedValue: string = ''
  ): Promise<string | null> {
    return new Promise(async (resolve) => {
      const inputs: any[] = [
        {
          name: 'category',
          type: 'radio',
          label: 'Sin categoría',
          value: '',
          checked: !selectedValue,
        },
      ];

      this.categories.forEach((cat) => {
        inputs.push({
          name: 'category',
          type: 'radio',
          label: cat.name,
          value: cat.id,
          checked: selectedValue === cat.id,
        });
      });

      const alert = await this.alertController.create({
        header: header,
        inputs: inputs,
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel',
            handler: () => resolve(null),
          },
          {
            text: 'Seleccionar',
            handler: (data) => {
              resolve(data || '');
            },
          },
        ],
      });

      await alert.present();
    });
  }

  // READ - Listar tareas (ya está en ngOnInit con suscripción)
  // UPDATE - Editar tarea
  async editTask(task: Task) {
  let selectedCategoryId = task.categoryId || '';

  const inputs: any[] = [
    {
      name: 'title',
      type: 'text',
      value: task.title,
      placeholder: 'Título de la tarea',
      attributes: {
        maxlength: 100,
        required: true,
      },
    },
    {
      name: 'description',
      type: 'textarea',
      value: task.description || '',
      placeholder: 'Descripción (opcional)',
      attributes: {
        maxlength: 500,
      },
    },
  ];

  const alert = await this.alertController.create({
    header: 'Editar Tarea',
    inputs: inputs,
    buttons: [
      {
        text: 'Cancelar',
        role: 'cancel',
      },
      ...(this.categories.length > 0
        ? [
            {
              text: 'Cambiar Categoría',
              handler: (): boolean => {
                // Lógica para cambiar categoría
                // Retornar false para mantener el alert abierto
                // o true para cerrarlo
                return false; // Ejemplo: mantener abierto
              }
            },
          ]
        : []),
      {
        text: 'Guardar',
        handler: async (data): Promise<boolean> => {
          // Validación
          if (!data.title?.trim()) {
            await this.showToast('El título es requerido', 'warning');
            return false;
          }

          try {
            await this.taskService.updateTask(task.id, {
              title: data.title.trim(),
              description: data.description?.trim(),
              categoryId: selectedCategoryId && selectedCategoryId !== 'all' 
                ? selectedCategoryId 
                : undefined,
            });
            await this.showToast('Tarea actualizada exitosamente', 'success');
            return true;
          } catch (error: any) {
            await this.showToast(
              error.message || 'Error al actualizar la tarea',
              'danger'
            );
            return false;
          }
        },
      },
    ],
  });

  await alert.present();
}
  // UPDATE - Completar tarea
  async toggleComplete(id: string) {
    try {
      await this.taskService.toggleComplete(id);
    } catch (error) {
      await this.showToast('Error al actualizar la tarea', 'danger');
    }
  }

  // DELETE - Eliminar tarea
  async deleteTask(id: string) {
    const alert = await this.alertController.create({
      header: 'Confirmar Eliminación',
      message: '¿Estás seguro de que deseas eliminar esta tarea?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              await this.taskService.deleteTask(id);
              await this.showToast('Tarea eliminada exitosamente', 'success');
            } catch (error) {
              await this.showToast('Error al eliminar la tarea', 'danger');
            }
          },
        },
      ],
    });

    await alert.present();
  }

  getCategoryName(categoryId?: string): string {
    if (!categoryId) return 'Sin categoría';
    const category = this.categories.find((c) => c.id === categoryId);
    return category ? category.name : 'Sin categoría';
  }

  getCategoryColor(categoryId?: string): string {
    if (!categoryId) return '#999';
    const category = this.categories.find((c) => c.id === categoryId);
    return category ? category.color : '#999';
  }

  getContrastColor(hexColor: string): string {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000000' : '#ffffff';
  }

  // Método auxiliar para trackBy (optimización)
  trackByTaskId(index: number, task: Task): string {
    return task.id;
  }

  // Método auxiliar para mostrar toasts
  private async showToast(
    message: string,
    color: 'success' | 'danger' | 'warning'
  ) {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
    });
    await toast.present();
  }
}
