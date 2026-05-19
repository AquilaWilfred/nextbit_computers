/**
 * Unified type exports
 * Import shared types from this single entry point.
 *
 * Note: this file is intentionally simplified until schema types
 * are available in the frontend project.
 */

export interface User {
  id: number;
  email: string;
  name: string;
  is_verified: boolean;
}

// export * from "./_core/errors"; // Temporarily commented out until _core/errors is created
