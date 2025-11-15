import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { Category } from '../models/category.models';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private storageKey = 'categories';
  private categoriesSubject = new BehaviorSubject<Category[]>([]);
  public categories$: Observable<Category[]> = this.categoriesSubject.asObservable();
  private storageInitialized = false;

  private defaultColors = [
    '#3880ff', '#3dc2ff', '#5260ff', '#2dd36f',
    '#ffc409', '#eb445a', '#92949c', '#f4f5f8'
  ];

  constructor(private storage: Storage) {
    this.initStorage();
  }

  private async initStorage() {
    if (!this.storageInitialized) {
      await this.storage.create();
      this.storageInitialized = true;
      await this.loadCategories();
    }
  }

  private async loadCategories() {
    try {
      const categories = await this.storage.get(this.storageKey);
      if (categories) {
        const parsed = categories.map((cat: any) => ({
          ...cat,
          createdAt: new Date(cat.createdAt)
        }));
        this.categoriesSubject.next(parsed);
      } else {
        this.categoriesSubject.next([]);
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      this.categoriesSubject.next([]);
    }
  }

  private async saveCategories(categories: Category[]) {
    try {
      await this.storage.set(this.storageKey, categories);
      this.categoriesSubject.next(categories);
    } catch (error) {
      console.error('Error saving categories:', error);
    }
  }

  async addCategory(name: string, color?: string): Promise<Category> {
    await this.initStorage();
    const categories = this.categoriesSubject.value;
    const newCategory: Category = {
      id: Date.now().toString(),
      name: name.trim(),
      color: color || this.getRandomColor(),
      createdAt: new Date()
    };
    categories.push(newCategory);
    await this.saveCategories(categories);
    return newCategory;
  }

  async updateCategory(id: string, name: string, color: string): Promise<void> {
    await this.initStorage();
    const categories = this.categoriesSubject.value;
    const category = categories.find(c => c.id === id);
    if (category) {
      category.name = name.trim();
      category.color = color;
      await this.saveCategories(categories);
    }
  }

  async deleteCategory(id: string): Promise<void> {
    await this.initStorage();
    const categories = this.categoriesSubject.value.filter(c => c.id !== id);
    await this.saveCategories(categories);
  }

  getCategories(): Category[] {
    return this.categoriesSubject.value;
  }

  getCategoryById(id: string): Category | undefined {
    return this.categoriesSubject.value.find(c => c.id === id);
  }

  private getRandomColor(): string {
    const usedColors = this.categoriesSubject.value.map(c => c.color);
    const available = this.defaultColors.filter(c => !usedColors.includes(c));
    return available.length > 0 
      ? available[Math.floor(Math.random() * available.length)]
      : this.defaultColors[Math.floor(Math.random() * this.defaultColors.length)];
  }
}