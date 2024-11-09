import { Entity, Column, PrimaryGeneratedColumn, OneToMany, CreateDateColumn, UpdateDateColumn } from "typeorm";
import { Todo } from "./todo";

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  peerId: string;

  @Column("simple-array")
  connectedPeers: string[];

  @Column()
  lastSync: Date;

  @Column({ nullable: true })
  deviceName?: string;

  @Column({ nullable: true })
  deviceType?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => Todo, todo => todo.user)
  todos: Todo[];
}
