import type { components } from '../api/schema';

/** Shapes generated from the backend OpenAPI document (Scramble). */
export type AuthUser = components['schemas']['UserResource'];

export type AuthMode = 'login' | 'register';
