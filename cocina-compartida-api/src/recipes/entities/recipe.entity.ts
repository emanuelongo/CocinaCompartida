import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from 'src/user/entities/user.entity';
import { Comment } from './comment.entity';
import { CookingExperience } from '../../cooking-journal/entities/cooking-experience.entity';

@Entity('recipes')
export class Recipe {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: false })
  name: string;

  @Column({ type: 'varchar', nullable: false, default: '' })
  descripcion: string;

  @Column('text', { array: true, nullable: false, default: [] })
  ingredients: string[];

  @Column({ type: 'int', default: 2 })
  servings: number;

  @Column('text', { array: true, nullable: false, default: [] })
  steps: string[];

  @Column('text', { array: true, nullable: false, default: [] })
  images: string[];

  @ManyToOne(() => User, (u) => u.recipes, {
    onDelete: 'CASCADE',
    eager: false,
  })
  user: User;

  @OneToMany(() => Comment, (c) => c.recipe, { cascade: true })
  comments: Comment[];

  @OneToMany(() => CookingExperience, (experience) => experience.recipe)
  cookingExperiences?: CookingExperience[];

  @Column('text', { array: true, nullable: true, default: [] })
  tags: string[];

  @Column({ type: 'varchar', nullable: true, default: 'platos-fuertes' })
  category: string;

  @Column({ type: 'varchar', nullable: true, default: 'media' })
  dificultad: string; // 'facil' | 'media' | 'dificil'

  @Column({ type: 'int', nullable: true, default: null })
  tiempoPreparacion: number; // en minutos

  @Column({ type: 'int', default: 0 })
  likes: number;

  @Column('text', { array: true, nullable: false, default: [] })
  likedBy: string[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
