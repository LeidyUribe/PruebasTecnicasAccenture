export interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  categoryId?: string;
  createdAt: number;
  updatedAt: number;
}