import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
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
export class TasksPage implements OnInit, OnDestroy, AfterViewInit {
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
    // SUBSCRIBE: Cambios en tareas
    this.taskService.tasks$
      .pipe(takeUntil(this.destroy$))
      .subscribe((tasks) => {
        this.filterTasks(tasks); // ← CORRECTO
      });

    // SUBSCRIBE: Cambios en categorías
    this.categoryService.categories$
      .pipe(takeUntil(this.destroy$))
      .subscribe((categories) => {
        this.categories = categories;
      });
  }

  ngAfterViewInit() {
    console.log("Tasks en vista:", this.tasks);
    console.log("Categorías:", this.categories);
    console.log("selectedCategoryId:", this.selectedCategoryId);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // FILTRO CORREGIDO
  filterTasks(allTasks: Task[]) {
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
    this.filterTasks(this.taskService.getAllTasks());
  }

  // CREATE
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
      inputs,
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
                  if (category !== null) {
                    selectedCategoryId = category;
                  }
                  return false; // Mantener abierto
                },
              },
            ]
          : []),
        {
          text: 'Crear',
          handler: async (data): Promise<boolean> => {
            if (!data.title?.trim()) {
              await this.showToast('El título es requerido', 'warning');
              return false;
            }

            try {
              // ✔ Categoría corregida aquí
              await this.taskService.createTask(
                data.title.trim(),
                data.description,
                selectedCategoryId
              );

              await this.showToast('Tarea creada exitosamente', 'success');
              return true;
            } catch {
              await this.showToast('Error al crear la tarea', 'danger');
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
        header,
        inputs,
        buttons: [
          {
            text: 'Cancelar',
            role: 'cancel',
            handler: () => resolve(null),
          },
          {
            text: 'Seleccionar',
            handler: (data) => resolve(data || ''),
          },
        ],
      });

      await alert.present();
    });
  }

  // EDIT
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
      inputs,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
        },
        ...(this.categories.length > 0
          ? [
              {
                text: 'Cambiar Categoría',
                handler: async () => {
                  const category = await this.showCategorySelector(
                    'Cambiar Categoría',
                    selectedCategoryId
                  );
                  if (category !== null) {
                    selectedCategoryId = category;
                  }
                  return false;
                },
              },
            ]
          : []),
        {
          text: 'Guardar',
          handler: async (data): Promise<boolean> => {
            if (!data.title?.trim()) {
              await this.showToast('El título es requerido', 'warning');
              return false;
            }

            try {
              await this.taskService.updateTask(task.id, {
                title: data.title.trim(),
                description: data.description?.trim(),
                categoryId: selectedCategoryId || undefined,
              });

              await this.showToast('Tarea actualizada correctamente', 'success');
              return true;
            } catch (error: any) {
              await this.showToast(error.message, 'danger');
              return false;
            }
          },
        },
      ],
    });

    await alert.present();
  }

  // COMPLETE
  async toggleComplete(id: string) {
    try {
      await this.taskService.toggleComplete(id);
    } catch {
      await this.showToast('Error al actualizar', 'danger');
    }
  }

  // DELETE
  async deleteTask(id: string) {
    const alert = await this.alertController.create({
      header: 'Eliminar Tarea',
      message: '¿Estás seguro?',
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
              await this.showToast('Tarea eliminada', 'success');
            } catch {
              await this.showToast('Error al eliminar', 'danger');
            }
          },
        },
      ],
    });

    await alert.present();
  }

  // HELPERS
  getCategoryName(categoryId?: string): string {
    if (!categoryId) return 'Sin categoría';
    return this.categories.find((c) => c.id === categoryId)?.name || 'Sin categoría';
  }

  getCategoryColor(categoryId?: string): string {
    if (!categoryId) return '#999';
    return this.categories.find((c) => c.id === categoryId)?.color || '#999';
  }

  getContrastColor(hexColor: string): string {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? '#000' : '#fff';
  }

  trackByTaskId(index: number, task: Task) {
    return task.id;
  }

  private async showToast(message: string, color: 'success' | 'danger' | 'warning') {
    const toast = await this.toastController.create({
      message,
      duration: 2000,
      color,
      position: 'bottom',
    });
    toast.present();
  }
}
