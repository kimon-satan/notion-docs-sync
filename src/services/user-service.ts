/**
 * @notion-sync: true
 * @notion-page: "User Management"
 * @description: Handles user authentication and profile management
 */

export interface User {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly createdAt: Date;
  readonly isActive: boolean;
}

export interface CreateUserRequest {
  readonly email: string;
  readonly name: string;
}

/**
 * Service class for managing users
 */
export class UserService {
  private readonly users: Map<string, User> = new Map();

  /**
   * Create a new user
   * @param request - User creation request
   * @returns The created user
   */
  async createUser(request: CreateUserRequest): Promise<User> {
    const user: User = {
      id: this.generateId(),
      email: request.email,
      name: request.name,
      createdAt: new Date(),
      isActive: true,
    };

    this.users.set(user.id, user);
    return user;
  }

  /**
   * Get a user by ID
   * @param id - User ID
   * @returns The user or undefined if not found
   */
  async getUserById(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  /**
   * Get all active users
   * @returns Array of active users
   */
  async getActiveUsers(): Promise<User[]> {
    return Array.from(this.users.values()).filter((user) => user.isActive);
  }

  /**
   * Deactivate a user
   * @param id - User ID
   * @returns True if user was deactivated, false if not found
   */
  async deactivateUser(id: string): Promise<boolean> {
    const user = this.users.get(id);
    if (!user) return false;

    this.users.set(id, { ...user, isActive: false });
    return true;
  }

  /**
   * Generate a unique user ID
   */
  private generateId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
