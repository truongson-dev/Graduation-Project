<?php

namespace App\Http\Requests\Profile;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateProfileRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        if ($this->has('username') && is_string($this->input('username'))) {
            $this->merge([
                'username' => strtolower(trim($this->input('username'))),
            ]);
        }
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'username' => [
                'sometimes',
                'string',
                'min:3',
                'max:30',
                'regex:/^[a-zA-Z0-9][a-zA-Z0-9_]{1,28}[a-zA-Z0-9]$/',
                Rule::notIn(['admin', 'administrator', 'system', 'support', 'moderator', 'mod', 'softskill', 'root', 'bot', 'official', 'help']),
                Rule::unique('community_profiles', 'username')->ignore($this->user()?->id, 'user_id'),
            ],
            'avatar_url' => ['nullable', 'url', 'max:2048'],
            'avatar' => ['nullable', 'file', 'image', 'mimes:jpeg,png,jpg,webp,gif', 'max:5120'],
            'headline' => ['nullable', 'string', 'max:120'],
            'bio' => ['nullable', 'string', 'max:280'],
        ];
    }

    /**
     * Get the validation messages that apply to the request.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => 'Họ và tên không được để trống.',
            'username.min' => 'Tên người dùng phải có ít nhất 3 ký tự.',
            'username.max' => 'Tên người dùng không được vượt quá 30 ký tự.',
            'username.regex' => 'Tên người dùng chỉ được chứa chữ cái, chữ số, gạch dưới (_) và không được bắt đầu hoặc kết thúc bằng gạch dưới.',
            'username.not_in' => 'Tên người dùng này thuộc danh sách dành riêng của hệ thống.',
            'username.unique' => 'Tên người dùng này đã được sử dụng.',
        ];
    }
}
