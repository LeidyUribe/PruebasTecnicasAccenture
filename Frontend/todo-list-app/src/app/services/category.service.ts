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