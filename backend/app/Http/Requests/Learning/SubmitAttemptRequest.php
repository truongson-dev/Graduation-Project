<?php

namespace App\Http\Requests\Learning;

use App\Enums\LessonType;
use App\Models\Lesson;
use Illuminate\Foundation\Http\FormRequest;

class SubmitAttemptRequest extends FormRequest
{
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
        $lessonId = $this->route('id');
        $lesson = $lessonId ? Lesson::find($lessonId) : null;

        if ($lesson) {
            if ($lesson->type === LessonType::Quiz) {
                return [
                    'answers' => ['required', 'array'],
                    'answers.*' => ['nullable', 'integer', 'min:0'],
                ];
            }

            if ($lesson->type === LessonType::Writing) {
                return [
                    'content' => ['required', 'string', 'min:20', 'max:10000'],
                ];
            }

            if ($lesson->type === LessonType::Theory) {
                return [
                    'completed' => ['nullable', 'boolean'],
                ];
            }
        }

        return [
            'answers' => ['nullable', 'array'],
            'content' => ['nullable', 'string'],
            'completed' => ['nullable', 'boolean'],
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'answers.required' => 'Vui lòng chọn câu trả lời cho các câu hỏi.',
            'content.required' => 'Nội dung bài viết không được để trống.',
            'content.min' => 'Bài viết quá ngắn. Vui lòng viết ít nhất 20 ký tự.',
            'content.max' => 'Bài viết không được vượt quá 10,000 ký tự.',
        ];
    }
}
