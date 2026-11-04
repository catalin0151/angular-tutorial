import { Component, inject } from "@angular/core";
import { FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";



@Component({
    selector: 'ch08-catalin-form',
    imports: [ReactiveFormsModule],
    templateUrl: './catalin-form.html',
    styleUrl: '../ch08-forms-reactive.css'
})
export class CatalinForm {
    private readonly fb = inject(NonNullableFormBuilder)

    // readonly form = this.fb.group({
    //     email: ['', [Validators.required, Validators.email]],
    //     password: ['', [Validators.required]]
    // });

    readonly form = new FormGroup({
        email: new FormControl('', [Validators.required, Validators.email]),
        password: new FormControl('', [Validators.required])
    })
    onSubmit() {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        console.log(this.form.getRawValue());
        this.form.reset();
    }
}