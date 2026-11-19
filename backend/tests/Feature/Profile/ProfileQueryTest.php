<?php

namespace Tests\Feature\Profile;

use App\Models\CommunityPost;
use App\Models\CommunityProfile;
use App\Models\PresentationSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProfileQueryTest extends TestCase
{
    use RefreshDatabase;

    public function test_authenticated_user_can_fetch_own_profile_with_stats(): void
    {
        $user = User::factory()->create(['name' => 'Tran Van A']);
        CommunityProfile::create([
            'user_id' => $user->id,
            'username' => 'tranvana',
            'headline' => 'Học viên đam mê giao tiếp',
            'bio' => 'Tự tin thuyết trình trước đám đông.',
        ]);

        PresentationSession::factory()->create([
            'user_id' => $user->id,
            'overall_score' => 85,
            'duration_seconds' => 120,
        ]);

        CommunityPost::create([
            'user_id' => $user->id,
            'content' => 'Bài viết đầu tiên của tôi',
        ]);

        $response = $this->actingAs($user, 'sanctum')->getJson('/api/v1/profile/me');

        $response->assertOk()
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonPath('user.email', $user->email)
            ->assertJsonPath('community_profile.username', 'tranvana')
            ->assertJsonPath('stats.presentation_count', 1)
            ->assertJsonPath('stats.average_score', 8.5)
            ->assertJsonPath('stats.practice_duration_minutes', 2)
            ->assertJsonPath('is_own_profile', true)
            ->assertJsonPath('is_following', false)
            ->assertJsonCount(1, 'posts');
    }

    public function test_authenticated_user_can_fetch_another_users_public_profile(): void
    {
        $viewer = User::factory()->create();
        $target = User::factory()->create(['name' => 'Nguyen Van B']);
        CommunityProfile::create([
            'user_id' => $target->id,
            'username' => 'nguyenvanb',
        ]);

        $response = $this->actingAs($viewer, 'sanctum')->getJson("/api/v1/profile/{$target->id}");

        $response->assertOk()
            ->assertJsonPath('user.id', $target->id)
            ->assertJsonPath('user.email', null)
            ->assertJsonPath('is_own_profile', false)
            ->assertJsonPath('is_following', false);
    }

    public function test_shows_is_following_true_when_viewer_follows_target(): void
    {
        $viewer = User::factory()->create();
        $target = User::factory()->create();

        $viewer->following()->attach($target->id);

        $response = $this->actingAs($viewer, 'sanctum')->getJson("/api/v1/profile/{$target->id}");

        $response->assertOk()
            ->assertJsonPath('user.id', $target->id)
            ->assertJsonPath('is_own_profile', false)
            ->assertJsonPath('is_following', true)
            ->assertJsonPath('stats.followers_count', 1);
    }

    public function test_unauthenticated_user_cannot_access_profile_endpoints(): void
    {
        $this->getJson('/api/v1/profile/me')->assertUnauthorized();
        $this->getJson('/api/v1/profile/1')->assertUnauthorized();
    }

    public function test_fetching_non_existent_profile_returns_not_found(): void
    {
        $viewer = User::factory()->create();

        $this->actingAs($viewer, 'sanctum')
            ->getJson('/api/v1/profile/999999')
            ->assertNotFound();
    }
}
