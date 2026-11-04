import { Component, inject } from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { JsonPipe } from '@angular/common';
import { CatalinForm } from './catalin-forms/catalin-form';
@Component({
  selector: 'app-ch08-forms-reactive',
  imports: [ReactiveFormsModule, JsonPipe, CatalinForm],
  templateUrl: './ch08-forms-reactive.html',
  styleUrl: './ch08-forms-reactive.css',
})
export class Ch08FormsReactive {
  private readonly fb = inject(NonNullableFormBuilder);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirm: ['', Validators.required],
    tags: this.fb.array<FormControl<string>>([]),
  }, { validators: [passwordsMatch] });

  get tags() { return this.form.controls.tags; }

  addTag() { this.tags.push(this.fb.control('')); }
  removeTag(i: number) { this.tags.removeAt(i); }

  submit() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    console.log('submitted', this.form.getRawValue());
    alert('Submitted! Check console.');
    this.form.reset();
  }
}

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('password')?.value;
  const confirm = group.get('confirm')?.value;
  return pw && confirm && pw !== confirm ? { passwordsMismatch: true } : null;
}
