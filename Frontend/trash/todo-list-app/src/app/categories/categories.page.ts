import { Component, OnInit, OnDestroy } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { CategoryService } from '../services/category.service';
import { Category } from '../models/category.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-categories',
  templateUrl: './categories.page.html',
  styleUrls: ['./categories.page.scss'],
  standalone: false
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