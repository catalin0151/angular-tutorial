import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { LoggerService } from './logger.service';

@Component({
  selector: 'app-ch05-services-di',
  imports: [DatePipe],
  templateUrl: './ch05-services-di.html',
  styleUrl: './ch05-services-di.css',
})
export class Ch05ServicesDi {
  readonly logger = inject(LoggerService);

  fireInfo()  { this.logger.info('something happened'); }
  fireWarn()  { this.logger.warn('be careful'); }
  fireError() { this.logger.error('something broke'); }
}
