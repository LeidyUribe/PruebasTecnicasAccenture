import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { Category } from '../models/category.models';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class CategoryService {
  private storageKey = 'categories';
  private categoriesSubject = new BehaviorSubject<Category[]>([]);
  public categories$: Observable<Category[]> =
    this.categoriesSubject.asObservable();
  private storageInitialized = false;
  private storageReady: Promise<Storage | null>;

  private defaultColors = [
    '#3880ff',
    '#3dc2ff',
    '#5260ff',
    '#2dd36f',
    '#ffc409',
    '#eb445a',
    '#92949c',
    '#f4f5f8',
  ];

  constructor(private storage: Storage) {
    this.storageReady = this.initStorage();
  }

  private async initStorage(): Promise<Storage | null> {
    if (typeof window === 'undefined') {
      console.warn('Skipping Ionic Storage on server');
      return null;
    }
    if (!this.storageInitialized) {
      try {
        const store = await this.storage.create();
        this.storageInitialized = true;
        await this.loadCategories(store);
        return store;
      } catch (err) {
        console.error('Storage init failed', err);
        return null;
      }
    }
    return this.storage;
  }

  private async loadCategories(store?: Storage | null) {
    try {
      const categories = await this.storage.get(this.storageKey);
      const resolvedStore = store ?? (await this.storageReady);
      if (!resolvedStore) {
        this.categoriesSubject.next([]);
        return;
      }
    } catch (error) {
      console.error('Error loading categories:', error);
      this.categoriesSubject.next([]);
    }
  }

  private async saveCategories(categories: Category[]) {
    const store = await this.storageReady;
    if (!store) {
      console.warn('Skipping save: storage unavailable');
      this.categoriesSubject.next(categories);
      return;
    }
    await store.set(this.storageKey, categories);
    this.categoriesSubject.next(categories);
  }

  async addCategory(name: string, color?: string): Promise<Category> {
    await this.storageReady;
    const categories = this.categoriesSubject.value;
    const newCategory: Category = {
      id: Date.now().toString(),
      name: name.trim(),
      color: color || this.getRandomColor(),
      createdAt: new Date(),
    };
    categories.push(newCategory);
    await this.saveCategories(categories);
    return newCategory;
  }

  async updateCategory(id: string, name: string, color: string): Promise<void> {
    await this.storageReady;
    const categories = this.categoriesSubject.value;
    const category = categories.find((c) => c.id === id);
    if (category) {
      category.name = name.trim();
      category.color = color;
      await this.saveCategories(categories);
    }
  }

  async deleteCategory(id: string): Promise<void> {
    await this.storageReady;
    const categories = this.categoriesSubject.value.filter((c) => c.id !== id);
    await this.saveCategories(categories);
  }

  getCategories(): Category[] {
    return this.categoriesSubject.value;
  }

  getCategoryById(id: string): Category | undefined {
    return this.categoriesSubject.value.find((c) => c.id === id);
  }

  private getRandomColor(): string {
    const usedColors = this.categoriesSubject.value.map((c) => c.color);
    const available = this.defaultColors.filter((c) => !usedColors.includes(c));
    return available.length > 0
      ? available[Math.floor(Math.random() * available.length)]
      : this.defaultColors[
          Math.floor(Math.random() * this.defaultColors.length)
        ];
  }
}
