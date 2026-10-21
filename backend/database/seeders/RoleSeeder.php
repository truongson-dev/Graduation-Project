<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class RoleSeeder extends Seeder
{
    /**
     * Seed the roles used across the application.
     */
    public function run(): void
    {
        foreach (['student', 'instructor', 'admin'] as $role) {
            Role::findOrCreate($role, 'web');
        }
    }
}
