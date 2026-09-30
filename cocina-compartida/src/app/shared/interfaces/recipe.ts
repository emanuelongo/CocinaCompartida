import { Comment } from './comment';
 
export interface IngredientItem {
  nombre: string;
  cantidad?: number | string;
  unidad?: string;
  otraUnidad?: string;
  importancia?: 'obligatorio' | 'opcional' | 'reemplazable';
  reemplazo?: string;
}

export interface Recipe {
  id: string;
  name: string;
  descripcion: string;
  ingredients: (string | IngredientItem)[] | any[];
  servings?: number;
  steps: string[];
  images: string[];
  user: {
    id: string;
    username: string;
    avatar?: string;
  };
  category: string;
  likes?: number;
  likedBy?: string[];
  comments?: Comment[];
  createdAt?: string | Date;
  dificultad?: 'facil' | 'media' | 'dificil';
  tiempoPreparacion?: number; // en minutos
}