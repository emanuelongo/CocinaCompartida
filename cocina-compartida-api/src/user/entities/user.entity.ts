import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Comment } from 'src/recipes/entities/comment.entity';
import { Recipe } from 'src/recipes/entities/recipe.entity';
import { CookingExperience } from '../../cooking-journal/entities/cooking-experience.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  username: string;

  @Column({ type: 'varchar' })
  password: string;

  @Column({ type: 'varchar', nullable: true, unique: true })
  email?: string;

  @Column({ type: 'varchar', nullable: true })
  avatar?: string;

  @Column({ type: 'text', nullable: true })
  bio?: string;

  // 🔹 Un usuario puede tener muchas recetas
  @OneToMany(() => Recipe, (recipe) => recipe.user, { cascade: true })
  recipes?: Recipe[];

  // 🔹 Un usuario puede tener muchos comentarios
  @OneToMany(() => Comment, (comment) => comment.user, { cascade: true })
  comments?: Comment[];

  @OneToMany(() => CookingExperience, (experience) => experience.user)
  cookingExperiences?: CookingExperience[];

  @Column({ type: 'boolean', name: 'is_active', default: true })
  isActive?: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt?: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt?: Date;

  @Column({ default: 'user' })
  role: string;

  @Column({
    type: 'boolean',
    name: 'reading_assistant_enabled',
    default: false,
  })
  readingAssistantEnabled: boolean;

  @Column({ type: 'boolean', name: 'auto_read_enabled', default: false })
  autoReadEnabled: boolean;

  @Column({ type: 'real', name: 'speech_rate', default: 1 })
  speechRate: number;

  @Column({
    type: 'varchar',
    name: 'preferred_voice',
    length: 120,
    nullable: true,
  })
  preferredVoice?: string | null;
}