
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import { User } from "./user";

@Entity()
export class Todo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  day: string;

  @Column()
  content: string;

  @Column({ default: false })
  done: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastModified: Date;

  @ManyToOne(() => User, user => user.todos)
  user: User;
}
