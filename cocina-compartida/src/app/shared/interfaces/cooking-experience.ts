export interface CookingExperienceRecipe {
  id: string;
  name: string;
  images?: string[];
}

export interface CookingExperience {
  id: string;
  rating: number;
  preparationNotes: string;
  ingredientChanges: string;
  recommendations: string;
  photoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  recipe: CookingExperienceRecipe;
}

export interface CreateCookingExperience {
  rating: number;
  preparationNotes: string;
  ingredientChanges: string;
  recommendations: string;
  photo?: File;
}