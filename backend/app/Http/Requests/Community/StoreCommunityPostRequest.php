<?php

namespace App\Http\Requests\Community;

use App\Enums\CommunityPostStatus;
use App\Enums\ReplyControl;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCommunityPostRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1', 'max:6'],
            'items.*.body' => ['required', 'string', 'min:1', 'max:500'],
            'topic_tag_id' => ['nullable', 'integer', Rule::exists('community_topic_tags', 'id')->where('is_active', true)],
            'quote_post_id' => [
                'nullable',
                'integer',
                Rule::exists('community_posts', 'id')
                    ->where('status', CommunityPostStatus::Published->value)
                    ->where('is_hidden_by_author', false)
                    ->whereNull('repost_of_id')
                    ->whereNull('deleted_at'),
            ],
            'reply_control' => ['nullable', 'string', Rule::enum(ReplyControl::class)],
            'poll' => ['nullable', 'array'],
            'poll.question' => ['nullable', 'string', 'max:280'],
            'poll.options' => ['required_with:poll', 'array', 'min:2', 'max:4'],
            'poll.options.*' => ['required_with:poll', 'string', 'min:1', 'max:120', 'distinct:ignore_case'],
            'poll.expires_in_hours' => ['nullable', 'integer', Rule::in([24, 72, 168])],
        ];
    }
}
