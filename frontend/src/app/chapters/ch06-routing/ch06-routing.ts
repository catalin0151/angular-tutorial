import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-ch06-routing',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './ch06-routing.html',
  styleUrl: './ch06-routing.css',
})
export class Ch06Routing {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  goProgrammatic() {
    this.router.navigate(['./accounts', 'ACC-042'], { relativeTo: this.route });
  }
}
