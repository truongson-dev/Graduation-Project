<?php

namespace Tests\Unit;

use App\Enums\CommunityPostStatus;
use App\Enums\ReplyControl;
use App\Models\CommunityPost;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class MediaTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_attach_avatar_media(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $file = UploadedFile::fake()->image('avatar.jpg', 100, 100);

        $media = $user->addMedia($file)->toMediaCollection('avatar');
        $this->assertNotNull($media);
        $this->assertTrue($user->hasMedia('avatar'));
        $this->assertNotEmpty($user->avatar_url);
    }

    public function test_community_post_can_attach_media(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $post = CommunityPost::create([
            'user_id' => $user->id,
            'body' => 'Bài viết có hình ảnh đính kèm',
            'reply_control' => ReplyControl::Everyone,
            'status' => CommunityPostStatus::Published,
        ]);

        $file = UploadedFile::fake()->image('post_image.png', 400, 300);

        $media = $post->addMedia($file)->toMediaCollection('images');
        $this->assertNotNull($media);
        $this->assertTrue($post->hasMedia('images'));
        $this->assertCount(1, $post->getMedia('images'));
        $this->assertNotEmpty($post->getFirstMediaUrl('images'));
    }
}
