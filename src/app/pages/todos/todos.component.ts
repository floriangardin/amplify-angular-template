import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClientService } from '../../services/client.service';

@Component({
  selector: 'app-todos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './todos.component.html',
  styleUrl: './todos.component.css',
})
export class TodosComponent implements OnInit {
  todos = signal<any[]>([]);
  clientService = inject(ClientService);

  ngOnInit(): void {
    this.listTodos();
  }

  listTodos() {
    try {
      this.clientService.client.models.Todo.observeQuery().subscribe({
        next: ({ items, isSynced }) => {
          this.todos.set(items);
        },
      });
    } catch (error) {
      console.error('error fetching todos', error);
    }
  }

  createTodo() {
    try {
      this.clientService.client.models.Todo.create({
        content: window.prompt('Todo content'),
      });
      this.listTodos();
    } catch (error) {
      console.error('error creating todos', error);
    }
  }

    
  deleteTodo(id: string) {
    this.clientService.client.models.Todo.delete({ id })
  }
}
