<?php

namespace Database\Factories;

use App\Models\PresentationSession;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<PresentationSession>
 */
class PresentationSessionFactory extends Factory
{
    protected $model = PresentationSession::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'status' => 'completed',
            'title' => fake()->sentence(3),
            'duration_seconds' => fake()->numberBetween(60, 600),
            'overall_score' => fake()->numberBetween(50, 100),
        ];
    }
}
