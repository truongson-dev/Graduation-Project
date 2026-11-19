<?php

use App\Enums\CommunityPostStatus;
use App\Models\CommunityPost;
use App\Models\CommunityProfile;
use App\Models\CommunityTopicTag;
use App\Models\User;
use App\Support\CommunityTextHelper;
use Database\Seeders\CommunityTopicTagSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;

beforeEach(function () {
    $this->seed(CommunityTopicTagSeeder::class);
});

it('B1: blocks direct read, branch replies, and replying under hidden replies or deleted roots/polls', function () {
    $author = User::factory()->create();
    $commenter = User::factory()->create();
    $viewer = User::factory()->create();

    $created = $this->actingAs($author)->postJson('/api/v1/community/posts', [
        'items' => [['body' => 'Bài viết gốc có bình chọn cần bảo vệ.']],
        'poll' => [
            'options' => ['Phương án A', 'Phương án B'],
        ],
    ])->assertCreated();

    $rootId = $created->json('data.id');
    $pollId = $created->json('data.poll.id');
    $optId = $created->json('data.poll.options.0.id');

    $lvl1Id = $this->actingAs($commenter)->postJson("/api/v1/community/posts/{$rootId}/replies", [
        'body' => 'Bình luận cấp 1 dài trên ba mươi ký tự để test.',
    ])->assertCreated()->json('data.id');

    // Author hides level-1 reply
    $this->actingAs($author)->patchJson("/api/v1/community/posts/{$lvl1Id}/hide-reply")->assertOk();

    // Direct show and branch replies for a hidden reply must return 404
    $this->actingAs($viewer)->getJson("/api/v1/community/posts/{$lvl1Id}")->assertNotFound();
    $this->actingAs($viewer)->getJson("/api/v1/community/posts/{$lvl1Id}/replies")->assertNotFound();

    // Replying under a hidden reply must be rejected
    $this->actingAs($viewer)->postJson("/api/v1/community/posts/{$lvl1Id}/replies", [
        'body' => 'Cố gắng trả lời vào nhánh đã bị tác giả ẩn.',
    ])->assertUnprocessable();

    // Unhide, then delete the root post in DB while a stale reply row remains published -> must reject reply & poll vote
    $this->actingAs($author)->patchJson("/api/v1/community/posts/{$lvl1Id}/hide-reply")->assertOk();

    CommunityPost::query()->whereKey($rootId)->update([
        'status' => CommunityPostStatus::Deleted->value,
        'deleted_at' => now(),
    ]);

    $this->actingAs($viewer)->postJson("/api/v1/community/posts/{$lvl1Id}/replies", [
        'body' => 'Trả lời vào comment khi bài gốc đã bị xóa.',
    ])->assertUnprocessable();

    $this->actingAs($viewer)->postJson("/api/v1/community/polls/{$pollId}/vote", [
        'option_id' => $optId,
    ])->assertUnprocessable();
});

it('B2: enforces single active pure repost per user and post at the database level', function () {
    $author = User::factory()->create();
    $reposter = User::factory()->create();

    $postId = $this->actingAs($author)->postJson('/api/v1/community/posts', [
        'items' => [['body' => 'Bài viết kiểm tra chống nhân bản repost.']],
    ])->assertCreated()->json('data.id');

    $this->actingAs($reposter)->postJson("/api/v1/community/posts/{$postId}/repost")
        ->assertOk()
        ->assertJsonPath('data.active', true)
        ->assertJsonPath('data.reposts_count', 1);

    // Attempting to insert a duplicate active pure repost directly must fail at DB constraint level
    expect(fn () => DB::table('community_posts')->insert([
        'user_id' => $reposter->id,
        'depth' => 0,
        'repost_of_id' => $postId,
        'status' => CommunityPostStatus::Published->value,
        'hot_score' => 10.0000,
        'created_at' => now(),
        'updated_at' => now(),
    ]))->toThrow(QueryException::class);

    // Toggling off and back on must reuse/recreate cleanly without violating uniqueness
    $this->actingAs($reposter)->postJson("/api/v1/community/posts/{$postId}/repost")
        ->assertOk()
        ->assertJsonPath('data.active', false)
        ->assertJsonPath('data.reposts_count', 0);

    $this->actingAs($reposter)->postJson("/api/v1/community/posts/{$postId}/repost")
        ->assertOk()
        ->assertJsonPath('data.active', true)
        ->assertJsonPath('data.reposts_count', 1);
});

it('B3: preserves reply counters for self-threads, recounts substantive replies, cascades children, and cleans up ghost reposts', function () {
    $author = User::factory()->create();
    $commenter = User::factory()->create();
    $reposter = User::factory()->create();

    // 1. Self-thread part deletion must NOT corrupt root.replies_count
    $threadRes = $this->actingAs($author)->postJson('/api/v1/community/posts', [
        'items' => [
            ['body' => 'Phần 1 của chuỗi bài viết gốc.'],
            ['body' => 'Phần 2 tiếp nối trong cùng chuỗi tự đăng.'],
        ],
    ])->assertCreated();
    $threadRootId = $threadRes->json('data.id');
    $part2Id = $threadRes->json('data.self_thread_items.0.id');

    $this->actingAs($author)->deleteJson("/api/v1/community/posts/{$part2Id}")->assertOk();
    expect(CommunityPost::query()->findOrFail($threadRootId)->replies_count)->toBe(0);

    // 2. Deleting a level-1 reply with a level-2 child cascades deletion and recounts root substantive_replies_count + hot_score
    $lvl1Id = $this->actingAs($commenter)->postJson("/api/v1/community/posts/{$threadRootId}/replies", [
        'body' => 'Đây là phản hồi cấp 1 đủ dài trên ba mươi ký tự.',
    ])->assertCreated()->json('data.id');

    $lvl2Id = $this->actingAs($author)->postJson("/api/v1/community/posts/{$lvl1Id}/replies", [
        'body' => 'Đây là phản hồi cấp 2 cũng đủ dài trên ba mươi ký tự.',
    ])->assertCreated()->json('data.id');

    $rootBeforeDelete = CommunityPost::query()->findOrFail($threadRootId);
    expect($rootBeforeDelete->replies_count)->toBe(2);
    expect($rootBeforeDelete->substantive_replies_count)->toBe(2);
    $hotScoreWithReplies = (float) $rootBeforeDelete->hot_score;

    $this->actingAs($commenter)->deleteJson("/api/v1/community/posts/{$lvl1Id}")->assertOk();

    $rootAfterDelete = CommunityPost::query()->findOrFail($threadRootId);
    expect($rootAfterDelete->replies_count)->toBe(0);
    expect($rootAfterDelete->substantive_replies_count)->toBe(0);
    expect((float) $rootAfterDelete->hot_score)->toBeLessThan($hotScoreWithReplies);
    expect(CommunityPost::withTrashed()->find($lvl2Id)?->status)->toBe(CommunityPostStatus::Deleted);
    expect(CommunityPost::withTrashed()->find($lvl2Id)?->trashed())->toBeTrue();

    // 3. Direct deletion of a pure repost decrements target reposts_count
    $repostToggle = $this->actingAs($reposter)->postJson("/api/v1/community/posts/{$threadRootId}/repost")->assertOk();
    expect($repostToggle->json('data.reposts_count'))->toBe(1);
    $repostRowId = CommunityPost::query()->where('repost_of_id', $threadRootId)->value('id');

    $this->actingAs($reposter)->deleteJson("/api/v1/community/posts/{$repostRowId}")->assertOk();
    expect(CommunityPost::query()->findOrFail($threadRootId)->reposts_count)->toBe(0);

    // 4. Deleting root post cleans up all pure reposts so no ghost reposts stay in feed
    $this->actingAs($reposter)->postJson("/api/v1/community/posts/{$threadRootId}/repost")->assertOk();
    $this->actingAs($author)->deleteJson("/api/v1/community/posts/{$threadRootId}")->assertOk();

    $feedRes = $this->actingAs($reposter)->getJson('/api/v1/community/feed?tab=for_you')->assertOk();
    expect($feedRes->json('data'))->toBeEmpty();
});

it('B5: safely ignores tampered or malformed cursors without triggering SQL errors', function () {
    $user = User::factory()->create();
    $postId = $this->actingAs($user)->postJson('/api/v1/community/posts', [
        'items' => [['body' => 'Bài viết kiểm tra cursor an toàn.']],
    ])->assertCreated()->json('data.id');

    $badScoreCursor = rtrim(strtr(base64_encode(json_encode(['score' => 'not-a-decimal', 'id' => 1])), '+/', '-_'), '=');
    $badDateCursor = rtrim(strtr(base64_encode(json_encode(['created_at' => 'not-a-datetime', 'id' => 1])), '+/', '-_'), '=');
    $badReactedCursor = rtrim(strtr(base64_encode(json_encode(['reacted_at' => 'invalid-date', 'id' => 1])), '+/', '-_'), '=');

    $this->actingAs($user)->getJson('/api/v1/community/feed?tab=for_you&cursor='.$badScoreCursor)->assertOk();
    $this->actingAs($user)->getJson('/api/v1/community/feed?tab=following&cursor='.$badDateCursor)->assertOk();
    $this->actingAs($user)->getJson('/api/v1/community/feed?tab=saved&cursor='.$badReactedCursor)->assertOk();
    $this->actingAs($user)->getJson("/api/v1/community/posts/{$postId}/replies?cursor={$badScoreCursor}")->assertOk();
});

it('W2 & W3: escapes SQL wildcards, handles stopwords/Vietnamese accents in searchPeople, and respects deleted_at in for_you', function () {
    $author = User::factory()->create(['name' => 'Lê Minh Khôi']);
    $viewer = User::factory()->create();

    $postId = $this->actingAs($author)->postJson('/api/v1/community/posts', [
        'items' => [['body' => 'Cách giữ bình tĩnh khi thuyết trình trước hội đồng.']],
    ])->assertCreated()->json('data.id');

    // Wildcard % must NOT match arbitrary posts or users
    $this->actingAs($viewer)->getJson('/api/v1/community/search?q='.urlencode('%%'))
        ->assertOk()
        ->assertJsonCount(0, 'data');

    $this->actingAs($viewer)->getJson('/api/v1/community/search?q='.urlencode('%%').'&filter=people')
        ->assertOk()
        ->assertJsonCount(0, 'data');

    // Accented Vietnamese query in searchPeople must match normalized body_search of the author's post
    $this->actingAs($viewer)->getJson('/api/v1/community/search?q='.urlencode('thuyết trình').'&filter=people')
        ->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.id', $author->id);

    // Stopwords and short tokens must not produce +the* in InnoDB boolean tokens when meaningful tokens exist
    $tokens = CommunityTextHelper::sanitizeBooleanSearchTokens('thuyết trình thế nào');
    expect($tokens)->toContain('+thuyet*')
        ->toContain('+trinh*')
        ->not->toContain('+the*');

    // W3: deleted_at non-null row must not leak in for_you even if status column wasn't updated
    CommunityPost::query()->whereKey($postId)->update(['deleted_at' => now()]);
    $this->actingAs($viewer)->getJson('/api/v1/community/feed?tab=for_you')
        ->assertOk()
        ->assertJsonCount(0, 'data');
});

it('W4 & W5 & S1 & S2: enforces exact handle match for mentioned_only, supports quote_post_id, validates feed/search query params, and hydrates search items', function () {
    $author = User::factory()->create(['name' => 'Tác Giả']);
    $userAn = User::factory()->create(['name' => 'An']);
    $userAnh = User::factory()->create(['name' => 'Anh']);

    CommunityProfile::query()->create(['user_id' => $userAn->id, 'username' => 'an', 'headline' => 'HV']);
    CommunityProfile::query()->create(['user_id' => $userAnh->id, 'username' => 'anh', 'headline' => 'HV']);

    $mentionedPostId = $this->actingAs($author)->postJson('/api/v1/community/posts', [
        'items' => [
            ['body' => 'Nhờ @an chia sẻ kinh nghiệm thuyết trình nhóm nhé!'],
            ['body' => 'Phần 2 tự nối của tác giả về chủ đề thuyết trình.'],
        ],
        'reply_control' => 'mentioned_only',
    ])->assertCreated()->json('data.id');

    // @anh must NOT match @an
    $this->actingAs($userAnh)->postJson("/api/v1/community/posts/{$mentionedPostId}/replies", [
        'body' => 'Tôi tên anh xin trả lời ké.',
    ])->assertForbidden();

    // @an MUST be allowed
    $replyId = $this->actingAs($userAn)->postJson("/api/v1/community/posts/{$mentionedPostId}/replies", [
        'body' => 'Cảm ơn đã nhắc mình!',
    ])->assertCreated()->json('data.id');

    // S2: liking a child reply must not alter root hot_score
    $rootScoreBefore = CommunityPost::query()->findOrFail($mentionedPostId)->hot_score;
    $this->actingAs($author)->postJson("/api/v1/community/posts/{$replyId}/reactions", ['type' => 'like'])->assertOk();
    expect(CommunityPost::query()->findOrFail($mentionedPostId)->hot_score)->toBe($rootScoreBefore);

    // W4: quote_post_id creates a quote post and increments quotes_count
    $quoteRes = $this->actingAs($userAn)->postJson('/api/v1/community/posts', [
        'items' => [['body' => 'Trích dẫn lại bài chia sẻ thuyết trình rất hay này.']],
        'quote_post_id' => $mentionedPostId,
    ])->assertCreated();

    $quoteRes->assertJsonPath('data.quote_post.id', $mentionedPostId);
    expect(CommunityPost::query()->findOrFail($mentionedPostId)->quotes_count)->toBe(1);

    // S1: search results include self_thread_items and quote_post
    $searchRes = $this->actingAs($userAn)->getJson('/api/v1/community/search?q=thuyet+trinh')->assertOk();
    $foundOriginal = collect($searchRes->json('data'))->firstWhere('id', $mentionedPostId);
    $foundQuote = collect($searchRes->json('data'))->firstWhere('id', $quoteRes->json('data.id'));

    expect($foundOriginal['self_thread_items'])->toHaveCount(1);
    expect($foundQuote['quote_post']['id'])->toBe($mentionedPostId);

    // W5: invalid query parameters return 422
    $this->actingAs($userAn)->getJson('/api/v1/community/feed?tab=invalid_tab')->assertUnprocessable();
    $this->actingAs($userAn)->getJson('/api/v1/community/search?q=test&filter=invalid_filter')->assertUnprocessable();
});

it('fixes self-thread mid-part deletion counters, part-2 detail/branch separation, and part-2 mentions', function () {
    $author = User::factory()->create(['name' => 'Tác Giả']);
    $commenter = User::factory()->create(['name' => 'Khánh']);
    CommunityProfile::query()->create(['user_id' => $commenter->id, 'username' => 'khanh', 'headline' => 'HV']);

    $created = $this->actingAs($author)->postJson('/api/v1/community/posts', [
        'items' => [
            ['body' => 'Phần 1 giới thiệu kỹ năng đàm phán lương.'],
            ['body' => 'Phần 2 nhờ @khanh chia sẻ góc nhìn thực tế nhé.'],
            ['body' => 'Phần 3 tổng kết các bước chuẩn bị trước buổi trao đổi.'],
        ],
        'reply_control' => 'mentioned_only',
    ])->assertCreated();

    $rootId = $created->json('data.id');
    $part2Id = $created->json('data.self_thread_items.0.id');
    $part3Id = $created->json('data.self_thread_items.1.id');

    // User mentioned in Part 2 MUST be allowed to reply under mentioned_only
    $this->actingAs($commenter)->postJson("/api/v1/community/posts/{$part2Id}/replies", [
        'body' => 'Cảm ơn đã nhắc mình ở phần 2, đây là phản hồi dài trên ba mươi ký tự!',
    ])->assertCreated();

    expect(CommunityPost::query()->findOrFail($rootId)->replies_count)->toBe(1);
    expect(CommunityPost::query()->findOrFail($rootId)->substantive_replies_count)->toBe(1);

    // Viewing Part 2 detail separates Part 3 into self_thread_items, NOT replies
    $part2Detail = $this->actingAs($commenter)->getJson("/api/v1/community/posts/{$part2Id}")->assertOk();
    expect($part2Detail->json('data.root_author_id'))->toBe($author->id);
    expect(collect($part2Detail->json('data.self_thread_items'))->pluck('id')->all())->toBe([$part3Id]);
    expect(collect($part2Detail->json('data.replies'))->pluck('id')->all())->not->toContain($part3Id);

    // Hiding a self-thread continuation part must be rejected
    $this->actingAs($author)->patchJson("/api/v1/community/posts/{$part2Id}/hide-reply")->assertUnprocessable();

    // Deleting Part 2 cascades Part 3 & commenter reply AND subtracts commenter reply from root counters
    $this->actingAs($author)->deleteJson("/api/v1/community/posts/{$part2Id}")->assertOk();

    $freshRoot = CommunityPost::query()->findOrFail($rootId);
    expect($freshRoot->replies_count)->toBe(0);
    expect($freshRoot->substantive_replies_count)->toBe(0);
});

it('blocks reposting replies, resolves pure repost interactions to target post, preserves reposted quote/self-thread, and validates poll duplicates', function () {
    $author = User::factory()->create();
    $viewer = User::factory()->create();

    $baseId = $this->actingAs($author)->postJson('/api/v1/community/posts', [
        'items' => [['body' => 'Bài gốc được trích dẫn trong chuỗi thảo luận.']],
    ])->assertCreated()->json('data.id');

    $quoteThreadId = $this->actingAs($author)->postJson('/api/v1/community/posts', [
        'items' => [
            ['body' => 'Phần 1 bài viết trích dẫn bài gốc ở trên.'],
            ['body' => 'Phần 2 bổ sung ví dụ giao tiếp nơi công sở.'],
        ],
        'quote_post_id' => $baseId,
    ])->assertCreated()->json('data.id');

    $replyId = $this->actingAs($viewer)->postJson("/api/v1/community/posts/{$quoteThreadId}/replies", [
        'body' => 'Một bình luận thông thường dưới bài viết.',
    ])->assertCreated()->json('data.id');

    // Reposting a reply (depth > 0) must be blocked with 422
    $this->actingAs($author)->postJson("/api/v1/community/posts/{$replyId}/repost")->assertUnprocessable();

    // Reposting root quote+self-thread succeeds and keeps quote_post & self_thread_items hydrated in feed
    $this->actingAs($viewer)->postJson("/api/v1/community/posts/{$quoteThreadId}/repost")
        ->assertOk()
        ->assertJsonPath('data.post_id', $quoteThreadId);

    $repostWrapperId = CommunityPost::query()
        ->where('user_id', $viewer->id)
        ->where('repost_of_id', $quoteThreadId)
        ->value('id');

    // Like/Reply via repostWrapperId resolves to $quoteThreadId cleanly (never attaches to empty wrapper)
    $this->actingAs($author)->postJson("/api/v1/community/posts/{$repostWrapperId}/reactions", ['type' => 'like'])
        ->assertOk()
        ->assertJsonPath('data.post_id', $quoteThreadId)
        ->assertJsonPath('data.likes_count', 1);

    // Quoting a pure repost wrapper must be blocked with 422
    $this->actingAs($author)->postJson('/api/v1/community/posts', [
        'items' => [['body' => 'Thử quote vỏ repost rỗng.']],
        'quote_post_id' => $repostWrapperId,
    ])->assertUnprocessable();

    // Duplicate poll options (case-insensitive) must be blocked with 422
    $this->actingAs($author)->postJson('/api/v1/community/posts', [
        'items' => [['body' => 'Khảo sát có đáp án trùng lặp.']],
        'poll' => [
            'options' => ['Đồng ý', 'đồng ý'],
        ],
    ])->assertUnprocessable();

    // Feed preserves repost_of.quote_post & repost_of.self_thread_items
    $feedRes = $this->actingAs($viewer)->getJson('/api/v1/community/feed?tab=for_you')->assertOk();
    $repostCard = collect($feedRes->json('data'))->firstWhere('id', $repostWrapperId);
    expect($repostCard['repost_of']['quote_post']['id'])->toBe($baseId);
    expect($repostCard['repost_of']['self_thread_items'])->toHaveCount(1);

    // Hiding a reply keeps it visible to the root author (for unhide) while hiding it from other viewers
    $this->actingAs($author)->patchJson("/api/v1/community/posts/{$replyId}/hide-reply")->assertOk();
    $authorDetail = $this->actingAs($author)->getJson("/api/v1/community/posts/{$quoteThreadId}")->assertOk();
    expect($authorDetail->json('data.replies'))->toHaveCount(1);
    expect($authorDetail->json('data.replies.0.is_hidden_by_author'))->toBeTrue();

    $viewerDetail = $this->actingAs($viewer)->getJson("/api/v1/community/posts/{$quoteThreadId}")->assertOk();
    expect($viewerDetail->json('data.replies'))->toHaveCount(0);
});
