<?php

namespace App\Http\Requests\Ai;

use Illuminate\Foundation\Http\FormRequest;

class EvaluatePresentationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'slide_content' => ['required', 'string', 'max:25000'],
            'transcript' => ['required', 'string', 'max:15000'],
            'duration' => ['required', 'string', 'max:50'],
            'words_per_minute' => ['required', 'integer', 'min:0', 'max:500'],
            'fillers_count' => ['required', 'integer', 'min:0', 'max:500'],
            'eye_contact_percent' => ['required', 'integer', 'min:0', 'max:100'],
            'posture_score' => ['required', 'integer', 'min:0', 'max:100'],
            'language' => ['nullable', 'string', 'in:vi,en'],
        ];
    }
}
