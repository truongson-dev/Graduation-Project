<?php

use App\Models\CommunityTopicTag;
use App\Models\User;
use Database\Seeders\CommunityTopicTagSeeder;
use Illuminate\Support\Facades\Cache;

beforeEach(function () {
    $this->seed(CommunityTopicTagSeeder::class);
    Cache::forget('community:trending:v1');
});

it('returns trending topics grouped by topic tag without AI and supports post_ids feed filter', function () {
    $author = User::factory()->create();
    $viewer = User::factory()->create();
    $tag = CommunityTopicTag::query()->where('slug', 'thuyet-trinh')->firstOrFail();

    $post1 = $this->actingAs($author)->postJson('/api/v1/community/posts', [
        'topic_tag_id' => $tag->id,
        'items' => [['body' => 'Bí quyết giữ bình tĩnh khi thuyết trình trước hội đồng phản biện.']],
    ])->assertCreated()->json('data.id');

    $post2 = $this->actingAs($author)->postJson('/api/v1/community/posts', [
        'topic_tag_id' => $tag->id,
        'items' => [['body' => 'Cách xử lý khi quên slide giữa buổi thuyết trình.']],
    ])->assertCreated()->json('data.id');

    $this->actingAs($viewer)
        ->postJson("/api/v1/community/users/{$author->id}/follow")
        ->assertOk();

    $response = $this->actingAs($viewer)
        ->getJson('/api/v1/community/trending')
        ->assertOk()
        ->assertJsonPath('data.0.title', 'Thảo luận về Thuyết trình')
        ->assertJsonPath('data.0.topic_slug', 'thuyet-trinh')
        ->assertJsonPath('data.0.posts_count', 2)
        ->assertJsonPath('data.0.post_ids', [$post2, $post1])
        ->assertJsonMissingPath('meta.ai_summarized');

    expect($response->json('data.0.summary'))->not->toBeEmpty();
    expect($response->json('meta.generated_at'))->not->toBeEmpty();

    // Feed filtered by exact post_ids returns those posts with hydrated viewer context
    $this->actingAs($viewer)
        ->getJson('/api/v1/community/feed?post_ids='.implode(',', [$post1, $post2]))
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.viewer.following', true);
});

it('ranks topic clusters by cumulative hot_score and handles untagged posts', function () {
    $author = User::factory()->create();
    $viewer = User::factory()->create();
    $highTag = CommunityTopicTag::query()->where('slug', 'phong-van')->firstOrFail();
    $lowTag = CommunityTopicTag::query()->where('slug', 'giao-tiep')->firstOrFail();

    $hotPostId = $this->actingAs($author)->postJson('/api/v1/community/posts', [
        'topic_tag_id' => $highTag->id,
        'items' => [['body' => 'Cách trả lời câu hỏi phỏng vấn System Design cho junior.']],
    ])->assertCreated()->json('data.id');

    // Boost engagement so phong-van outranks giao-tiep despite fewer posts
    $this->actingAs($viewer)->postJson("/api/v1/community/posts/{$hotPostId}/reactions", ['type' => 'like'])->assertOk();
    $this->actingAs($viewer)->postJson("/api/v1/community/posts/{$hotPostId}/repost")->assertOk();
    $this->actingAs($viewer)->postJson("/api/v1/community/posts/{$hotPostId}/replies", [
        'body' => 'Mình thấy nên nhấn mạnh vào yêu cầu phi chức năng và trade-off ngay từ đầu.',
    ])->assertCreated();

    $this->actingAs($author)->postJson('/api/v1/community/posts', [
        'topic_tag_id' => $lowTag->id,
        'items' => [['body' => 'Giao tiếp hiệu quả với đồng đội.']],
    ])->assertCreated();

    $this->actingAs($author)->postJson('/api/v1/community/posts', [
        'items' => [['body' => 'Chia sẻ thói quen ghi chú nhanh sau mỗi buổi họp.']],
    ])->assertCreated();

    $res = $this->actingAs($viewer)
        ->getJson('/api/v1/community/trending')
        ->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonPath('data.0.topic_slug', 'phong-van')
        ->assertJsonPath('data.0.title', 'Thảo luận về Phỏng vấn');

    $general = collect($res->json('data'))->firstWhere('topic_slug', null);
    expect($general)->not->toBeNull();
    expect($general['title'])->toBe('Chủ đề nổi bật trong cộng đồng');
});

it('invalidates cached trending snapshot when posts are created or deleted', function () {
    $author = User::factory()->create();
    $tag = CommunityTopicTag::query()->where('slug', 'giao-tiep')->firstOrFail();

    $postId = $this->actingAs($author)->postJson('/api/v1/community/posts', [
        'topic_tag_id' => $tag->id,
        'items' => [['body' => 'Làm sao để vượt qua cảm giác ngại giao tiếp nơi đông người?']],
    ])->assertCreated()->json('data.id');

    // Populate cache
    $this->actingAs($author)
        ->getJson('/api/v1/community/trending')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.posts_count', 1)
        ->assertJsonPath('data.0.post_ids', [$postId]);

    // Creating a new post invalidates cache immediately
    $postId2 = $this->actingAs($author)->postJson('/api/v1/community/posts', [
        'topic_tag_id' => $tag->id,
        'items' => [['body' => 'Kinh nghiệm lắng nghe chủ động trong buổi họp nhóm.']],
    ])->assertCreated()->json('data.id');

    $this->actingAs($author)
        ->getJson('/api/v1/community/trending')
        ->assertOk()
        ->assertJsonPath('data.0.posts_count', 2);

    // Deleting posts invalidates cache immediately
    $this->actingAs($author)->deleteJson("/api/v1/community/posts/{$postId}")->assertOk();
    $this->actingAs($author)->deleteJson("/api/v1/community/posts/{$postId2}")->assertOk();

    $this->actingAs($author)
        ->getJson('/api/v1/community/trending')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});
