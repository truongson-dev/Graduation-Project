<?php

namespace App\Http\Requests\Community;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CommunitySearchRequest extends FormRequest
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
            'q' => ['nullable', 'string', 'max:200'],
            'filter' => ['nullable', 'string', Rule::in(['top', 'latest', 'people'])],
            'limit' => ['nullable', 'integer', 'min:1', 'max:30'],
            'post_ids' => ['nullable', 'string', 'max:500', 'regex:/^\d+(,\d+)*$/'],
        ];
    }
}
