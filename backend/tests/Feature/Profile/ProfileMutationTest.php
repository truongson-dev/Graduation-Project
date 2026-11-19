<?php

namespace Tests\Feature\Profile;

use App\Models\CommunityProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProfileMutationTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_update_profile_info(): void
    {
        $user = User::factory()->create(['name' => 'Old Name']);
        CommunityProfile::create(['user_id' => $user->id, 'username' => 'olduser']);

        $response = $this->actingAs($user, 'sanctum')->putJson('/api/v1/profile', [
            'name' => 'New Name',
            'headline' => 'Senior Soft Skill Learner',
            'bio' => 'Cập nhật tiểu sử mới.',
            'avatar_url' => 'https://example.com/avatar.png',
        ]);

        $response->assertOk()
            ->assertJsonPath('user.name', 'New Name')
            ->assertJsonPath('user.avatar_url', 'https://example.com/avatar.png')
            ->assertJsonPath('community_profile.headline', 'Senior Soft Skill Learner')
            ->assertJsonPath('community_profile.bio', 'Cập nhật tiểu sử mới.');

        $this->assertDatabaseHas('users', [
            'id' => $user->id,
            'name' => 'New Name',
            'avatar_url' => 'https://example.com/avatar.png',
        ]);
        $this->assertDatabaseHas('community_profiles', [
            'user_id' => $user->id,
            'headline' => 'Senior Soft Skill Learner',
            'bio' => 'Cập nhật tiểu sử mới.',
        ]);
    }

    public function test_user_can_update_profile_without_existing_community_profile(): void
    {
        $user = User::factory()->create(['name' => 'First Time User']);

        $response = $this->actingAs($user, 'sanctum')->putJson('/api/v1/profile', [
            'name' => 'Updated User',
            'headline' => 'Brand New Learner',
            'bio' => 'Tự học kỹ năng mềm.',
        ]);

        $response->assertOk()
            ->assertJsonPath('user.name', 'Updated User')
            ->assertJsonPath('community_profile.headline', 'Brand New Learner')
            ->assertJsonPath('community_profile.bio', 'Tự học kỹ năng mềm.');

        $this->assertDatabaseHas('community_profiles', [
            'user_id' => $user->id,
            'headline' => 'Brand New Learner',
        ]);
    }

    public function test_user_can_update_community_username(): void
    {
        $user = User::factory()->create(['name' => 'Hoang Anh']);
        CommunityProfile::create(['user_id' => $user->id, 'username' => 'hoanganh_old']);

        $response = $this->actingAs($user, 'sanctum')->putJson('/api/v1/profile', [
            'name' => 'Hoang Anh Updated',
            'username' => 'hoanganh_new',
        ]);

        $response->assertOk()
            ->assertJsonPath('community_profile.username', 'hoanganh_new');

        $this->assertDatabaseHas('community_profiles', [
            'user_id' => $user->id,
            'username' => 'hoanganh_new',
        ]);
    }

    public function test_update_profile_rejects_reserved_username(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->putJson('/api/v1/profile', [
            'name' => 'Test User',
            'username' => 'admin',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['username']);
    }

    public function test_update_profile_rejects_invalid_username_format(): void
    {
        $user = User::factory()->create();

        // Starts with underscore, or too short, or contains special chars
        $response = $this->actingAs($user, 'sanctum')->putJson('/api/v1/profile', [
            'name' => 'Test User',
            'username' => '_bad_name',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['username']);
    }

    public function test_update_profile_rejects_duplicate_username(): void
    {
        $otherUser = User::factory()->create();
        CommunityProfile::create(['user_id' => $otherUser->id, 'username' => 'taken_username']);

        $currentUser = User::factory()->create();

        $response = $this->actingAs($currentUser, 'sanctum')->putJson('/api/v1/profile', [
            'name' => 'Test User',
            'username' => 'taken_username',
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['username']);
    }

    public function test_user_can_keep_own_username_when_updating_profile(): void
    {
        $user = User::factory()->create(['name' => 'Original Name']);
        CommunityProfile::create(['user_id' => $user->id, 'username' => 'my_unique_handle']);

        $response = $this->actingAs($user, 'sanctum')->putJson('/api/v1/profile', [
            'name' => 'Updated Name Only',
            'username' => 'my_unique_handle',
        ]);

        $response->assertOk()
            ->assertJsonPath('user.name', 'Updated Name Only')
            ->assertJsonPath('community_profile.username', 'my_unique_handle');
    }

    public function test_user_can_change_password_with_valid_current_password(): void
    {
        $user = User::factory()->create(['password' => Hash::make('old-password-123')]);

        $response = $this->actingAs($user, 'sanctum')->putJson('/api/v1/profile/password', [
            'current_password' => 'old-password-123',
            'new_password' => 'new-password-456',
            'new_password_confirmation' => 'new-password-456',
        ]);

        $response->assertOk()
            ->assertJsonPath('message', 'Đổi mật khẩu thành công.');
        $this->assertTrue(Hash::check('new-password-456', $user->fresh()->password));
    }

    public function test_change_password_fails_if_current_password_incorrect(): void
    {
        $user = User::factory()->create(['password' => Hash::make('correct-password')]);

        $response = $this->actingAs($user, 'sanctum')->putJson('/api/v1/profile/password', [
            'current_password' => 'wrong-password',
            'new_password' => 'new-password-456',
            'new_password_confirmation' => 'new-password-456',
        ]);

        $response->assertStatus(422)->assertJsonValidationErrors(['current_password']);
    }

    public function test_update_profile_validation_rejects_empty_name_or_excessive_length(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user, 'sanctum')->putJson('/api/v1/profile', [
            'name' => '',
            'headline' => str_repeat('a', 121),
            'bio' => str_repeat('b', 281),
        ]);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['name', 'headline', 'bio']);
    }

    public function test_unauthenticated_user_cannot_access_profile_mutation_endpoints(): void
    {
        $this->putJson('/api/v1/profile', ['name' => 'Test'])->assertUnauthorized();
        $this->putJson('/api/v1/profile/password', ['current_password' => '123'])->assertUnauthorized();
        $this->postJson('/api/v1/profile/avatar')->assertUnauthorized();
        $this->deleteJson('/api/v1/profile/avatar')->assertUnauthorized();
    }

    public function test_user_can_upload_avatar_image_via_media_library(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $file = UploadedFile::fake()->image('avatar.jpg', 300, 300);

        $response = $this->actingAs($user, 'sanctum')->post('/api/v1/profile/avatar', [
            'avatar' => $file,
        ], ['Accept' => 'application/json']);

        $response->assertOk()
            ->assertJsonPath('message', 'Cập nhật ảnh đại diện thành công.')
            ->assertJsonStructure([
                'message',
                'avatar_url',
                'thumb_url',
                'user' => ['id', 'name', 'email', 'avatar_url'],
            ]);

        $this->assertTrue($user->fresh()->hasMedia('avatar'));
        $this->assertNotNull($user->fresh()->avatar_url);
        $this->assertDatabaseHas('media', [
            'model_type' => User::class,
            'model_id' => $user->id,
            'collection_name' => 'avatar',
        ]);
    }

    public function test_user_can_delete_uploaded_avatar(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $file = UploadedFile::fake()->image('avatar.png', 200, 200);

        $this->actingAs($user, 'sanctum')->post('/api/v1/profile/avatar', [
            'avatar' => $file,
        ], ['Accept' => 'application/json'])->assertOk();

        $this->assertTrue($user->fresh()->hasMedia('avatar'));

        $response = $this->actingAs($user, 'sanctum')->deleteJson('/api/v1/profile/avatar');

        $response->assertOk()
            ->assertJsonPath('message', 'Đã xóa ảnh đại diện.')
            ->assertJsonPath('avatar_url', null);

        $this->assertFalse($user->fresh()->hasMedia('avatar'));
        $this->assertNull($user->fresh()->avatar_url);
    }

    public function test_user_cannot_upload_invalid_file_as_avatar(): void
    {
        Storage::fake('public');

        $user = User::factory()->create();
        $file = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');

        $response = $this->actingAs($user, 'sanctum')->post('/api/v1/profile/avatar', [
            'avatar' => $file,
        ], ['Accept' => 'application/json']);

        $response->assertStatus(422)
            ->assertJsonValidationErrors(['avatar']);
    }
}
