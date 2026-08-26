import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Recipe } from '../../recipes/entities/recipe.entity';
import { User } from '../../user/entities/user.entity';

@Entity('cooking_experiences')
@Check('CHK_cooking_experience_rating', '"rating" >= 1 AND "rating" <= 5')
export class CookingExperience {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'smallint' })
  rating: number;

  @Column({ type: 'text', name: 'preparation_notes', default: '' })
  preparationNotes: string;

  @Column({ type: 'text', name: 'ingredient_changes', default: '' })
  ingredientChanges: string;

  @Column({ type: 'text', default: '' })
  recommendations: string;

  @Column({ type: 'varchar', name: 'photo_url', nullable: true })
  photoUrl?: string | null;

  @ManyToOne(() => User, (user) => user.cookingExperiences, {
    onDelete: 'CASCADE',
  })
  user: User;

  @ManyToOne(() => Recipe, (recipe) => recipe.cookingExperiences, {
    onDelete: 'CASCADE',
  })
  recipe: Recipe;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}