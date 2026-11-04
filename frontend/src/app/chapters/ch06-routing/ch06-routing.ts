import { Component, computed, inject, input } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet, ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';

@Component({
  selector: 'app-ch06-routing',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './ch06-routing.html',
  styleUrl: './ch06-routing.css',
})
export class Ch06Routing {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly search = toSignal(this.route.queryParamMap.pipe(map(p => p.get('s') || '')), { initialValue: '' })
  readonly tab = input<string>('tab1')
  goProgrammatic() {
    this.router.navigate(['./accounts', 'ACC-042'], { relativeTo: this.route });
  }
  onSearch(e: Event) {
    let searchString = (e.target as HTMLInputElement).value;
    this.router.navigate([], {
      queryParams: {
        s: searchString || null
      },
      queryParamsHandling: 'merge',
      relativeTo: this.route
    })
  }
  goToChapterOne() {
    this.router.navigate(['./ch02-components']);
  }
  activeTab = computed(() => {
    return this.tab() || 'tab1';
    //return this.route.snapshot.queryParamMap.get('tab') || 'tab1';
  });
}
