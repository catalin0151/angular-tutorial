import { Injectable, signal } from '@angular/core';

export interface LogEntry {
  at: Date;
  level: 'info' | 'warn' | 'error';
  message: string;
}

@Injectable({ providedIn: 'root' })
export class LoggerService {
  private readonly _entries = signal<LogEntry[]>([]);
  readonly entries = this._entries.asReadonly();

  info(message: string)  { this.push('info',  message); }
  warn(message: string)  { this.push('warn',  message); }
  error(message: string) { this.push('error', message); }

  clear() { this._entries.set([]); }

  private push(level: LogEntry['level'], message: string) {
    this._entries.update(list => [...list, { at: new Date(), level, message }]);
  }
}
