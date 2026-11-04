import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'yesno' })
export class YesNoPipe implements PipeTransform {
    transform(value: string | boolean | undefined | null) {
        return value ? 'yes' : 'no';
    }
}