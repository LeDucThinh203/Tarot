import { forbidden } from './errors.js';

export function assertResourceOwner(ownerId: string, requesterId: string): void {
  if (ownerId !== requesterId) throw forbidden();
}
