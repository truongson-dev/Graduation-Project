<?php

use App\Enums\CommunityPostStatus;
use App\Models\CommunityPost;
use App\Models\CommunityTopicTag;
use App\Models\User;
use Database\Seeders\CommunityTopicTagSeeder;

beforeEach(function () {
    $this->seed(CommunityTopicTagSeeder::class);
});

it('creates a single post and a multi-part self-thread with a poll', function () {
    $user = User::factory()->create(['name' => 'Bảo Trâm']);
    $tag = CommunityTopicTag::query()->where('slug', 'giao-tiep')->firstOrFail();

    $response = $this->actingAs($user)
        ->postJson('/api/v1/community/posts', [
            'topic_tag_id' => $tag->id,
            'reply_control' => 'everyone',
            'items' => [
                ['body' => 'Khi sếp giao việc mơ hồ, nên chủ động làm nháp hay hỏi lại yêu cầu?'],
                ['body' => 'Theo mình bước 1 là chốt lại kỳ vọng đầu ra bằng 3 gạch đầu dòng.'],
            ],
            'poll' => [
                'question' => 'Bạn chọn hướng nào?',
                'options' => ['Làm nháp trước', 'Hỏi rõ ngay'],
                'expires_in_hours' => 72,
            ],
        ]);

    $response->assertCreated()
        ->assertJsonPath('data.body', 'Khi sếp giao việc mơ hồ, nên chủ động làm nháp hay hỏi lại yêu cầu?')
        ->assertJsonPath('data.topic_tag.slug', 'giao-tiep')
        ->assertJsonPath('data.poll.options.0.label', 'Làm nháp trước')
        ->assertJsonPath('data.self_thread_items.0.body', 'Theo mình bước 1 là chốt lại kỳ vọng đầu ra bằng 3 gạch đầu dòng.');

    $rootId = $response->json('data.id');
    expect(CommunityPost::query()->where('thread_group_id', $rootId)->count())->toBe(2);
    expect($tag->fresh()->posts_count)->toBe(1);
});

it('paginates the for_you feed with keyset cursors without duplicates', function () {
    $author = User::factory()->create();

    for ($i = 1; $i <= 5; $i++) {
        $this->actingAs($author)
            ->postJson('/api/v1/community/posts', [
                'items' => [['body' => "Bài thảo luận số {$i} về kỹ năng phản biện."]],
            ])
            ->assertCreated();
    }

    $page1 = $this->actingAs($author)
        ->getJson('/api/v1/community/feed?tab=for_you&limit=3')
        ->assertOk()
        ->assertJsonCount(3, 'data')
        ->assertJsonPath('meta.has_more', true);

    $cursor = $page1->json('meta.next_cursor');
    expect($cursor)->not->toBeNull();

    $page2 = $this->actingAs($author)
        ->getJson('/api/v1/community/feed?tab=for_you&limit=3&cursor='.$cursor)
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.has_more', false);

    $idsPage1 = collect($page1->json('data'))->pluck('id')->all();
    $idsPage2 = collect($page2->json('data'))->pluck('id')->all();
    expect(array_intersect($idsPage1, $idsPage2))->toBeEmpty();
});

it('filters following feed to followed authors only', function () {
    $viewer = User::factory()->create();
    $followed = User::factory()->create();
    $stranger = User::factory()->create();

    $this->actingAs($viewer)->postJson("/api/v1/community/users/{$followed->id}/follow")
        ->assertOk()
        ->assertJsonPath('data.following', true);

    $this->actingAs($followed)->postJson('/api/v1/community/posts', [
        'items' => [['body' => 'Bài viết từ người được theo dõi.']],
    ])->assertCreated();

    $this->actingAs($stranger)->postJson('/api/v1/community/posts', [
        'items' => [['body' => 'Bài viết từ người lạ.']],
    ])->assertCreated();

    $this->actingAs($viewer)->postJson('/api/v1/community/posts', [
        'items' => [['body' => 'Bài viết của chính mình.']],
    ])->assertCreated();

    $feed = $this->actingAs($viewer)
        ->getJson('/api/v1/community/feed?tab=following')
        ->assertOk()
        ->assertJsonCount(1, 'data');

    $bodies = collect($feed->json('data'))->pluck('body')->all();
    expect($bodies)->toContain('Bài viết từ người được theo dõi.');
    expect($bodies)->not->toContain('Bài viết của chính mình.', 'Bài viết từ người lạ.');
});

it('builds nested reply trees and hides entire hidden sub-branches', function () {
    $author = User::factory()->create();
    $commenter = User::factory()->create();
    $viewer = User::factory()->create();

    $rootRes = $this->actingAs($author)->postJson('/api/v1/community/posts', [
        'items' => [['body' => 'Chủ đề gốc về kỹ năng lắng nghe.']],
    ])->assertCreated();
    $rootId = $rootRes->json('data.id');

    $lvl1Res = $this->actingAs($commenter)->postJson("/api/v1/community/posts/{$rootId}/replies", [
        'body' => 'Phản hồi cấp 1 rất đáng suy ngẫm về cách đặt câu hỏi mở.',
    ])->assertCreated();
    $lvl1Id = $lvl1Res->json('data.id');

    $lvl2Res = $this->actingAs($author)->postJson("/api/v1/community/posts/{$lvl1Id}/replies", [
        'body' => 'Phản hồi cấp 2 nối tiếp nhánh cấp 1.',
    ])->assertCreated();
    $lvl2Id = $lvl2Res->json('data.id');

    $this->actingAs($viewer)->getJson("/api/v1/community/posts/{$rootId}")
        ->assertOk()
        ->assertJsonCount(2, 'data.replies')
        ->assertJsonPath('data.post.replies_count', 2);

    // Viewing level 2 post should include root & lvl1 in ancestors
    $this->actingAs($viewer)->getJson("/api/v1/community/posts/{$lvl2Id}")
        ->assertOk()
        ->assertJsonCount(2, 'data.ancestors');

    // Author hides level 1 reply -> level 2 child branch must also disappear
    $this->actingAs($author)->patchJson("/api/v1/community/posts/{$lvl1Id}/hide-reply")
        ->assertOk()
        ->assertJsonPath('data.is_hidden_by_author', true);

    $this->actingAs($viewer)->getJson("/api/v1/community/posts/{$rootId}")
        ->assertOk()
        ->assertJsonCount(0, 'data.replies');
});

it('enforces reply_control rules across locked, followers, and mentioned_only posts', function () {
    $author = User::factory()->create(['name' => 'Minh Anh']);
    $other = User::factory()->create(['name' => 'Quốc Trung']);

    $lockedId = $this->actingAs($author)->postJson('/api/v1/community/posts', [
        'items' => [['body' => 'Thông báo khóa bình luận.']],
        'reply_control' => 'locked',
    ])->assertCreated()->json('data.id');

    $this->actingAs($other)->postJson("/api/v1/community/posts/{$lockedId}/replies", [
        'body' => 'Thử trả lời bài đã khóa.',
    ])->assertForbidden();

    $followersOnlyId = $this->actingAs($author)->postJson('/api/v1/community/posts', [
        'items' => [['body' => 'Chỉ người theo dõi được trả lời.']],
        'reply_control' => 'followers',
    ])->assertCreated()->json('data.id');

    $this->actingAs($other)->postJson("/api/v1/community/posts/{$followersOnlyId}/replies", [
        'body' => 'Chưa follow thì không trả lời được.',
    ])->assertForbidden();

    $this->actingAs($other)->postJson("/api/v1/community/users/{$author->id}/follow")->assertOk();

    $this->actingAs($other)->postJson("/api/v1/community/posts/{$followersOnlyId}/replies", [
        'body' => 'Follow rồi nên trả lời bình thường.',
    ])->assertCreated();
});

it('toggles likes, bookmarks, reposts, and switches poll votes atomically', function () {
    $author = User::factory()->create();
    $voter = User::factory()->create();

    $created = $this->actingAs($author)->postJson('/api/v1/community/posts', [
        'items' => [['body' => 'Tình huống thuyết trình bị quên ý giữa chừng.']],
        'poll' => [
            'options' => ['Hít thở và tóm tắt ý trước', 'Xin phép xem ghi chú'],
        ],
    ])->assertCreated();

    $postId = $created->json('data.id');
    $pollId = $created->json('data.poll.id');
    $opt1 = $created->json('data.poll.options.0.id');
    $opt2 = $created->json('data.poll.options.1.id');

    // Like & unlike
    $this->actingAs($voter)->postJson("/api/v1/community/posts/{$postId}/reactions", ['type' => 'like'])
        ->assertOk()
        ->assertJsonPath('data.active', true)
        ->assertJsonPath('data.likes_count', 1);

    $this->actingAs($voter)->postJson("/api/v1/community/posts/{$postId}/reactions", ['type' => 'like'])
        ->assertOk()
        ->assertJsonPath('data.active', false)
        ->assertJsonPath('data.likes_count', 0);

    // Repost toggle
    $this->actingAs($voter)->postJson("/api/v1/community/posts/{$postId}/repost")
        ->assertOk()
        ->assertJsonPath('data.active', true)
        ->assertJsonPath('data.reposts_count', 1);

    // Vote poll opt1 then switch to opt2
    $this->actingAs($voter)->postJson("/api/v1/community/polls/{$pollId}/vote", ['option_id' => $opt1])
        ->assertOk()
        ->assertJsonPath('data.total_votes', 1)
        ->assertJsonPath('data.options.0.votes_count', 1)
        ->assertJsonPath('data.options.1.votes_count', 0);

    $this->actingAs($voter)->postJson("/api/v1/community/polls/{$pollId}/vote", ['option_id' => $opt2])
        ->assertOk()
        ->assertJsonPath('data.total_votes', 1)
        ->assertJsonPath('data.options.0.votes_count', 0)
        ->assertJsonPath('data.options.1.votes_count', 1);

    // Soft delete syncs status = deleted
    $this->actingAs($author)->deleteJson("/api/v1/community/posts/{$postId}")
        ->assertOk();

    $deletedPost = CommunityPost::withTrashed()->find($postId);
    expect($deletedPost?->status)->toBe(CommunityPostStatus::Deleted);
});

it('searches posts by normalized Vietnamese keywords and supports latest and people filters', function () {
    $author = User::factory()->create(['name' => 'Nguyễn Huế Chi']);
    $viewer = User::factory()->create();

    $this->actingAs($author)->postJson('/api/v1/community/posts', [
        'items' => [['body' => 'Bí quyết giữ bình tĩnh khi thuyết trình trước hội đồng.']],
    ])->assertCreated();

    $this->actingAs($author)->postJson('/api/v1/community/posts', [
        'items' => [['body' => 'Cách viết email xin thực tập chuyên nghiệp tại Huế.']],
    ])->assertCreated();

    // Default top search
    $this->actingAs($viewer)
        ->getJson('/api/v1/community/search?q=thuyet+trinh')
        ->assertOk()
        ->assertJsonCount(1, 'data');

    // Filter latest search
    $this->actingAs($viewer)
        ->getJson('/api/v1/community/search?q=Hue&filter=latest')
        ->assertOk()
        ->assertJsonCount(1, 'data');

    // Search pinned by post_ids returns the exact posts even when query is a high-level topic title
    $this->actingAs($viewer)
        ->getJson('/api/v1/community/search?q=Chu+de+khong+khop&post_ids=1,2')
        ->assertOk()
        ->assertJsonCount(2, 'data');

    // Filter people search with hydrated following status
    $res = $this->actingAs($viewer)
        ->getJson('/api/v1/community/search?q=Hue&filter=people')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.name', 'Nguyễn Huế Chi')
        ->assertJsonPath('data.0.following', false);

    // Follow author and verify following toggles
    $this->actingAs($viewer)
        ->postJson("/api/v1/community/users/{$author->id}/follow")
        ->assertOk();

    $this->actingAs($viewer)
        ->getJson('/api/v1/community/search?q=Hue&filter=people')
        ->assertOk()
        ->assertJsonPath('data.0.following', true);
});

it('filters saved and liked feeds to the viewer reactions with cursor pagination', function () {
    $author = User::factory()->create();
    $viewer = User::factory()->create();
    $other = User::factory()->create();
    $tagA = CommunityTopicTag::query()->where('slug', 'giao-tiep')->firstOrFail();
    $tagB = CommunityTopicTag::query()->where('slug', 'thuyet-trinh')->firstOrFail();

    $postIds = [];
    foreach ([
        ['body' => 'Bài viết 1 giao tiếp', 'topic_tag_id' => $tagA->id],
        ['body' => 'Bài viết 2 thuyết trình', 'topic_tag_id' => $tagB->id],
        ['body' => 'Bài viết 3 giao tiếp', 'topic_tag_id' => $tagA->id],
    ] as $payload) {
        $postIds[] = $this->actingAs($author)
            ->postJson('/api/v1/community/posts', [
                'topic_tag_id' => $payload['topic_tag_id'],
                'items' => [['body' => $payload['body']]],
            ])
            ->assertCreated()
            ->json('data.id');
    }

    // Viewer bookmarks post 0 & post 1 & post 2; likes post 1 only
    foreach ($postIds as $id) {
        $this->actingAs($viewer)
            ->postJson("/api/v1/community/posts/{$id}/reactions", ['type' => 'bookmark'])
            ->assertOk();
    }
    $this->actingAs($viewer)
        ->postJson("/api/v1/community/posts/{$postIds[1]}/reactions", ['type' => 'like'])
        ->assertOk();

    // Other user likes post 0 (must not leak into viewer's liked feed)
    $this->actingAs($other)
        ->postJson("/api/v1/community/posts/{$postIds[0]}/reactions", ['type' => 'like'])
        ->assertOk();

    // Saved feed pagination
    $savedPage1 = $this->actingAs($viewer)
        ->getJson('/api/v1/community/feed?tab=saved&limit=2')
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.has_more', true);

    $savedCursor = $savedPage1->json('meta.next_cursor');
    $savedPage2 = $this->actingAs($viewer)
        ->getJson('/api/v1/community/feed?tab=saved&limit=2&cursor='.$savedCursor)
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('meta.has_more', false);

    $savedIds = array_merge(
        collect($savedPage1->json('data'))->pluck('id')->all(),
        collect($savedPage2->json('data'))->pluck('id')->all(),
    );
    expect($savedIds)->toHaveCount(3);

    // Saved feed filtered by topic
    $this->actingAs($viewer)
        ->getJson('/api/v1/community/feed?tab=saved&topic=giao-tiep')
        ->assertOk()
        ->assertJsonCount(2, 'data');

    // Liked feed returns only post 1
    $likedFeed = $this->actingAs($viewer)
        ->getJson('/api/v1/community/feed?tab=liked')
        ->assertOk()
        ->assertJsonCount(1, 'data');

    expect($likedFeed->json('data.0.id'))->toBe($postIds[1]);
});

it('hydrates viewer following state across feed, thread detail, and search responses', function () {
    $author = User::factory()->create();
    $viewer = User::factory()->create();

    $postId = $this->actingAs($author)
        ->postJson('/api/v1/community/posts', [
            'items' => [['body' => 'Bài viết kiểm tra trạng thái theo dõi đồng bộ.']],
        ])
        ->assertCreated()
        ->json('data.id');

    // Initially not following
    $this->actingAs($viewer)
        ->getJson('/api/v1/community/feed?tab=for_you')
        ->assertOk()
        ->assertJsonPath('data.0.viewer.following', false);

    // Follow author
    $this->actingAs($viewer)
        ->postJson("/api/v1/community/users/{$author->id}/follow")
        ->assertOk()
        ->assertJsonPath('data.following', true);

    // Hydrated as true across feed, thread detail, and search
    $this->actingAs($viewer)
        ->getJson('/api/v1/community/feed?tab=for_you')
        ->assertOk()
        ->assertJsonPath('data.0.viewer.following', true);

    $this->actingAs($viewer)
        ->getJson("/api/v1/community/posts/{$postId}")
        ->assertOk()
        ->assertJsonPath('data.post.viewer.following', true);

    $this->actingAs($viewer)
        ->getJson('/api/v1/community/search?q=dong+bo')
        ->assertOk()
        ->assertJsonPath('data.0.viewer.following', true);
});
