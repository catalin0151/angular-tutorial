import { computed, Injectable, signal } from "@angular/core";


export interface User {
    id: number,
    name: string,
    role: 'admin' | 'trader' | 'ops'
}

@Injectable({ providedIn: 'root' })
export class UserService {
    readonly currentUser = signal<User | null>(null);
    readonly isLoggedIn = computed(() => {
        return !!this.currentUser
    });
    readonly displayName = computed(() => {
        return this.currentUser()?.name || 'guest'
    })

    login(user: User) {
        this.currentUser.set(user);
    }
    logout() {
        this.currentUser.set(null)
    }

}