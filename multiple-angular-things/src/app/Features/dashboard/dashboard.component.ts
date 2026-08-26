import {Component,OnInit,OnDestroy} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {CommonModule} from '@angular/common';
import {  interval, Subscription} from 'rxjs';
import { RouterOutlet } from '@angular/router';
import { ButtonModule } from 'primeng/button';


interface Task {
  title: string;
  completed: boolean;
}


interface DashboardCard {
  title: string;
  description: string;
  icon: string;
}
interface UpcomingTask {
  title: string;
  time: string;
  status: 'Pending' | 'In Progress' | 'Completed';
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ButtonModule,FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent  implements OnInit, OnDestroy { 
 
  /* =========================
     USER
  ========================= */

  userName = 'Ganti Vinay';


  /* =========================
     CLOCK
  ========================= */

  currentTime = '';

  greeting = '';

  private clockSubscription?: Subscription;


  /* =========================
     WEATHER
  ========================= */

  temperature = 28;

  weather = 'Clear';


  /* =========================
     FOCUS
  ========================= */

  focus = '';


  /* =========================
     TODO
  ========================= */

  todoOpen = false;

  newTask = '';

  tasks: Task[] = [];


  /* =========================
     QUOTE
  ========================= */

  quote =
    'The secret of getting ahead is getting started.';

  quoteAuthor =
    'Mark Twain';


  /* =========================
     INIT
  ========================= */

  ngOnInit(): void {

    this.loadData();

    this.getGreeting();
 
    this.clockSubscription =
      interval(1000)
        .subscribe(() => { 
            this.getGreeting();
        });
      
  }


getGreeting() {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) {
    this.greeting = 'Good Morning';
  } else if (hour >= 12 && hour < 17) {
    this.greeting = 'Good Afternoon';
  } else if (hour >= 17 && hour < 21) {
    this.greeting = 'Good Evening';
  } else {
    this.greeting = 'Good Night';
  }
}

  saveFocus(): void {

    if (!this.focus.trim()) {
      return;
    }

    localStorage.setItem(
      'momentum-focus',
      this.focus
    );
  }


  clearFocus(): void {

    this.focus = '';

    localStorage.removeItem(
      'momentum-focus'
    );
  }


  /* =========================
     TODO
  ========================= */

  addTask(): void {
    const title =
      this.newTask.trim();
    if (!title) {
      return;
    }
    this.tasks.push({
      title,
      completed: false
    });
    this.newTask = '';
    this.saveTasks();
  }
  toggleTask(index: number): void {
    this.tasks[index].completed =
      !this.tasks[index].completed;
    this.saveTasks();
  }

  deleteTask(index: number): void {
    this.tasks.splice(index, 1);
    this.saveTasks();
  }
  saveTasks(): void {
    localStorage.setItem(
      'momentum-tasks',
      JSON.stringify(this.tasks)
    );
  }


  /* =========================
     LOAD
  ========================= */

  loadData(): void {

    const savedFocus =
      localStorage.getItem(
        'momentum-focus'
      );

    if (savedFocus) {

      this.focus = savedFocus;
    }


    const savedTasks =
      localStorage.getItem(
        'momentum-tasks'
      );

    if (savedTasks) {

      this.tasks =
        JSON.parse(savedTasks);
    }
  }


  /* =========================
     DESTROY
  ========================= */

  ngOnDestroy(): void {

    this.clockSubscription?.unsubscribe();
  }
  upcomingTasks: UpcomingTask[] = [
  {
    title: 'Complete Angular Supplier Master',
    time: '10:00 AM',
    status: 'In Progress'
  },
  {
    title: 'Test JWT Authentication',
    time: '11:30 AM',
    status: 'Pending'
  },
  {
    title: 'Fix Toastr Notification',
    time: '01:00 PM',
    status: 'Completed'
  },
  {
    title: 'Work on Dashboard UI',
    time: '03:00 PM',
    status: 'Pending'
  },
  {
    title: 'Review Flask API',
    time: '05:00 PM',
    status: 'Pending'
  }
];


}