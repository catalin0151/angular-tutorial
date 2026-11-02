import { Component, signal, output } from '@angular/core'

@Component({
    selector: 'app-add-user',
    templateUrl: './add-user.html',
    styleUrl: './add-user.css'
})
export class AddUser {
    readonly name = signal<string>('');
    readonly submit = output<string>();

    onAddNewUser() {
        if (!this.name()) {
            return;
        }
        this.submit.emit(this.name());
        this.name.set('')
    }
    onNameChange(event: Event) {
        this.name.set((event.target as HTMLInputElement).value)
    }
}