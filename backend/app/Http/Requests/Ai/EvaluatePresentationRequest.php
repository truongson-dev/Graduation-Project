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
            'audio' => ['nullable', 'file', 'mimes:webm,wav,mp3,ogg,m4a,weba,mp4', 'max:25600'],
            'slide_content' => ['nullable', 'string', 'max:50000'],
            'title' => ['nullable', 'string', 'max:255'],
            'duration' => ['required', 'string', 'max:50'],
            'eye_contact_percent' => ['required', 'integer', 'min:0', 'max:100'],
            'posture_score' => ['required', 'integer', 'min:0', 'max:100'],
            'language' => ['nullable', 'string', 'in:vi,en'],
            'transcript' => ['nullable', 'string', 'max:25000'],
            'words_per_minute' => ['nullable', 'integer', 'min:0', 'max:500'],
            'fillers_count' => ['nullable', 'integer', 'min:0', 'max:500'],
        ];
    }
}
