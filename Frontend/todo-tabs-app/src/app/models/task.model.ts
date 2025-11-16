export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  categoryId?: string;
  createdAt: number;
  updatedAt: number;
}